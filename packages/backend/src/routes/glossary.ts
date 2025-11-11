/**
 * Glossary Management Routes
 * 
 * API endpoints for managing custom translation glossary terms.
 * Users can define custom translations for specific terms that will be
 * applied during the MT stage.
 * 
 * Requirements: 3.2
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/glossary
 * 
 * Get all glossary terms for the authenticated user
 * Optional filters: sourceLanguage, targetLanguage
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sourceLanguage, targetLanguage } = req.query;

    const where: any = { userId };

    if (sourceLanguage) {
      where.sourceLanguage = sourceLanguage as string;
    }

    if (targetLanguage) {
      where.targetLanguage = targetLanguage as string;
    }

    const glossaryTerms = await prisma.glossary.findMany({
      where,
      orderBy: [
        { sourceLanguage: 'asc' },
        { targetLanguage: 'asc' },
        { sourceTerm: 'asc' },
      ],
    });

    res.json({
      glossary: glossaryTerms,
      count: glossaryTerms.length,
    });
  } catch (error: any) {
    console.error('Error fetching glossary:', error);
    res.status(500).json({ error: 'Failed to fetch glossary terms' });
  }
});

/**
 * GET /api/glossary/:id
 * 
 * Get a specific glossary term by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const glossaryTerm = await prisma.glossary.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!glossaryTerm) {
      return res.status(404).json({ error: 'Glossary term not found' });
    }

    res.json(glossaryTerm);
  } catch (error: any) {
    console.error('Error fetching glossary term:', error);
    res.status(500).json({ error: 'Failed to fetch glossary term' });
  }
});

/**
 * POST /api/glossary
 * 
 * Create a new glossary term
 * 
 * Body:
 * {
 *   "sourceLanguage": "en",
 *   "targetLanguage": "es",
 *   "sourceTerm": "AI",
 *   "targetTerm": "IA"
 * }
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sourceLanguage, targetLanguage, sourceTerm, targetTerm } = req.body;

    // Validate required fields
    if (!sourceLanguage || !targetLanguage || !sourceTerm || !targetTerm) {
      return res.status(400).json({
        error: 'Missing required fields: sourceLanguage, targetLanguage, sourceTerm, targetTerm',
      });
    }

    // Validate language codes (basic check)
    if (sourceLanguage.length !== 2 || targetLanguage.length !== 2) {
      return res.status(400).json({
        error: 'Language codes must be 2-character ISO 639-1 codes',
      });
    }

    // Validate terms are not empty
    if (!sourceTerm.trim() || !targetTerm.trim()) {
      return res.status(400).json({
        error: 'Source term and target term cannot be empty',
      });
    }

    // Check if term already exists
    const existingTerm = await prisma.glossary.findUnique({
      where: {
        userId_sourceLanguage_targetLanguage_sourceTerm: {
          userId,
          sourceLanguage,
          targetLanguage,
          sourceTerm: sourceTerm.trim(),
        },
      },
    });

    if (existingTerm) {
      return res.status(409).json({
        error: 'This glossary term already exists',
        existingTerm,
      });
    }

    // Create glossary term
    const glossaryTerm = await prisma.glossary.create({
      data: {
        userId,
        sourceLanguage,
        targetLanguage,
        sourceTerm: sourceTerm.trim(),
        targetTerm: targetTerm.trim(),
      },
    });

    res.status(201).json(glossaryTerm);
  } catch (error: any) {
    console.error('Error creating glossary term:', error);
    res.status(500).json({ error: 'Failed to create glossary term' });
  }
});

/**
 * PUT /api/glossary/:id
 * 
 * Update an existing glossary term
 * 
 * Body:
 * {
 *   "targetTerm": "Nueva traducción"
 * }
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { targetTerm } = req.body;

    // Validate target term
    if (!targetTerm || !targetTerm.trim()) {
      return res.status(400).json({
        error: 'Target term cannot be empty',
      });
    }

    // Check if term exists and belongs to user
    const existingTerm = await prisma.glossary.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingTerm) {
      return res.status(404).json({ error: 'Glossary term not found' });
    }

    // Update glossary term
    const updatedTerm = await prisma.glossary.update({
      where: { id },
      data: {
        targetTerm: targetTerm.trim(),
      },
    });

    res.json(updatedTerm);
  } catch (error: any) {
    console.error('Error updating glossary term:', error);
    res.status(500).json({ error: 'Failed to update glossary term' });
  }
});

/**
 * DELETE /api/glossary/:id
 * 
 * Delete a glossary term
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if term exists and belongs to user
    const existingTerm = await prisma.glossary.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingTerm) {
      return res.status(404).json({ error: 'Glossary term not found' });
    }

    // Delete glossary term
    await prisma.glossary.delete({
      where: { id },
    });

    res.json({ message: 'Glossary term deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting glossary term:', error);
    res.status(500).json({ error: 'Failed to delete glossary term' });
  }
});

/**
 * POST /api/glossary/batch
 * 
 * Create multiple glossary terms at once
 * 
 * Body:
 * {
 *   "terms": [
 *     {
 *       "sourceLanguage": "en",
 *       "targetLanguage": "es",
 *       "sourceTerm": "AI",
 *       "targetTerm": "IA"
 *     },
 *     ...
 *   ]
 * }
 */
router.post('/batch', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { terms } = req.body;

    if (!Array.isArray(terms) || terms.length === 0) {
      return res.status(400).json({
        error: 'terms must be a non-empty array',
      });
    }

    // Validate all terms
    for (const term of terms) {
      if (!term.sourceLanguage || !term.targetLanguage || !term.sourceTerm || !term.targetTerm) {
        return res.status(400).json({
          error: 'Each term must have sourceLanguage, targetLanguage, sourceTerm, and targetTerm',
        });
      }
    }

    // Create terms (skip duplicates)
    const created = [];
    const skipped = [];

    for (const term of terms) {
      try {
        const glossaryTerm = await prisma.glossary.create({
          data: {
            userId,
            sourceLanguage: term.sourceLanguage,
            targetLanguage: term.targetLanguage,
            sourceTerm: term.sourceTerm.trim(),
            targetTerm: term.targetTerm.trim(),
          },
        });
        created.push(glossaryTerm);
      } catch (error: any) {
        // Skip if duplicate
        if (error.code === 'P2002') {
          skipped.push(term);
        } else {
          throw error;
        }
      }
    }

    res.status(201).json({
      created,
      skipped,
      createdCount: created.length,
      skippedCount: skipped.length,
    });
  } catch (error: any) {
    console.error('Error creating batch glossary terms:', error);
    res.status(500).json({ error: 'Failed to create glossary terms' });
  }
});

/**
 * DELETE /api/glossary/batch
 * 
 * Delete multiple glossary terms at once
 * 
 * Body:
 * {
 *   "ids": ["uuid1", "uuid2", ...]
 * }
 */
router.delete('/batch', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'ids must be a non-empty array',
      });
    }

    // Delete terms that belong to the user
    const result = await prisma.glossary.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    res.json({
      message: 'Glossary terms deleted successfully',
      deletedCount: result.count,
    });
  } catch (error: any) {
    console.error('Error deleting batch glossary terms:', error);
    res.status(500).json({ error: 'Failed to delete glossary terms' });
  }
});

export default router;
