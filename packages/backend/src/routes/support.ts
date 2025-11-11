import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

// Create support ticket
router.post('/tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { subject, description, category, priority } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }

    const validCategories = ['technical', 'billing', 'feature', 'other'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        description,
        category: category || 'other',
        priority: priority || 'medium'
      },
      include: {
        user: {
          select: {
            email: true,
            subscriptionTier: true
          }
        }
      }
    });

    logger.info(`Support ticket created by user ${userId}: ${ticket.id}`);

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket
    });
  } catch (error) {
    logger.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// Get user's support tickets
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { status, limit = 50 } = req.query;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    res.json({ tickets });
  } catch (error) {
    logger.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

// Get specific ticket with messages
router.get('/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId // Ensure user can only access their own tickets
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket });
  } catch (error) {
    logger.error('Error fetching support ticket:', error);
    res.status(500).json({ error: 'Failed to fetch support ticket' });
  }
});

// Add message to ticket
router.post('/tickets/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify ticket belongs to user
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketMessage = await prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        userId,
        message,
        isStaff: false
      }
    });

    // Update ticket status if it was resolved
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'open' }
      });
    }

    res.status(201).json({
      message: 'Message added successfully',
      ticketMessage
    });
  } catch (error) {
    logger.error('Error adding ticket message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Update ticket status (admin only)
router.patch('/tickets/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData: any = { status };
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: updateData
    });

    res.json({ message: 'Ticket status updated', ticket });
  } catch (error) {
    logger.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

// Get all tickets (admin only)
router.get('/admin/tickets', authenticateToken, async (req, res) => {
  try {
    const { status, priority, category, limit = 100, offset = 0 } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: Number(limit),
        skip: Number(offset),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              subscriptionTier: true
            }
          },
          _count: {
            select: { messages: true }
          }
        }
      }),
      prisma.supportTicket.count({ where })
    ]);

    res.json({
      tickets,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching all tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get support statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [
      totalTickets,
      byStatus,
      byPriority,
      byCategory,
      averageResolutionTime
    ] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.supportTicket.groupBy({
        by: ['priority'],
        where,
        _count: true
      }),
      prisma.supportTicket.groupBy({
        by: ['category'],
        where,
        _count: true
      }),
      prisma.supportTicket.findMany({
        where: {
          ...where,
          resolvedAt: { not: null }
        },
        select: {
          createdAt: true,
          resolvedAt: true
        }
      }).then(tickets => {
        if (tickets.length === 0) return null;
        const totalTime = tickets.reduce((sum, ticket) => {
          const time = ticket.resolvedAt!.getTime() - ticket.createdAt.getTime();
          return sum + time;
        }, 0);
        return Math.round(totalTime / tickets.length / (1000 * 60 * 60)); // hours
      })
    ]);

    res.json({
      totalTickets,
      byStatus,
      byPriority,
      byCategory,
      averageResolutionTimeHours: averageResolutionTime
    });
  } catch (error) {
    logger.error('Error fetching support stats:', error);
    res.status(500).json({ error: 'Failed to fetch support statistics' });
  }
});

export default router;
