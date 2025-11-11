import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  projectId?: string;
}

interface ProgressMessage {
  type: 'upload_progress' | 'processing_progress' | 'error' | 'complete';
  projectId: string;
  progress?: number; // 0-100
  stage?: string;
  message?: string;
  error?: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private userClients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      console.log('WebSocket connection attempt');

      // Extract token from query string
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const projectId = url.searchParams.get('projectId');

      if (!token || !projectId) {
        ws.close(1008, 'Missing token or projectId');
        return;
      }

      try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        ws.userId = decoded.userId;
        ws.projectId = projectId;

        // Add client to tracking by project
        if (!this.clients.has(projectId)) {
          this.clients.set(projectId, new Set());
        }
        this.clients.get(projectId)!.add(ws);

        // Add client to tracking by user
        if (!this.userClients.has(ws.userId)) {
          this.userClients.set(ws.userId, new Set());
        }
        this.userClients.get(ws.userId)!.add(ws);

        console.log(`WebSocket authenticated for user ${ws.userId}, project ${projectId}`);

        ws.on('close', () => {
          this.removeClient(projectId, ws);
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.removeClient(projectId, ws);
        });

        // Send connection confirmation
        ws.send(
          JSON.stringify({
            type: 'connected',
            projectId,
            message: 'WebSocket connection established',
          })
        );
      } catch (error) {
        console.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Invalid token');
      }
    });

    console.log('WebSocket server initialized');
  }

  private removeClient(projectId: string, ws: AuthenticatedWebSocket) {
    // Remove from project clients
    const projectClients = this.clients.get(projectId);
    if (projectClients) {
      projectClients.delete(ws);
      if (projectClients.size === 0) {
        this.clients.delete(projectId);
      }
    }

    // Remove from user clients
    if (ws.userId) {
      const userClientSet = this.userClients.get(ws.userId);
      if (userClientSet) {
        userClientSet.delete(ws);
        if (userClientSet.size === 0) {
          this.userClients.delete(ws.userId);
        }
      }
    }
  }

  /**
   * Send progress update to all clients connected to a project
   */
  sendProgress(message: ProgressMessage) {
    const projectClients = this.clients.get(message.projectId);
    if (!projectClients || projectClients.size === 0) {
      return;
    }

    const payload = JSON.stringify(message);

    projectClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Send upload progress update
   */
  sendUploadProgress(projectId: string, progress: number, message?: string) {
    this.sendProgress({
      type: 'upload_progress',
      projectId,
      progress,
      message,
    });
  }

  /**
   * Send processing progress update
   */
  sendProcessingProgress(projectId: string, stage: string, progress: number, message?: string) {
    this.sendProgress({
      type: 'processing_progress',
      projectId,
      stage,
      progress,
      message,
    });
  }

  /**
   * Send error message
   */
  sendError(projectId: string, error: string) {
    this.sendProgress({
      type: 'error',
      projectId,
      error,
    });
  }

  /**
   * Send completion message
   */
  sendComplete(projectId: string, message: string) {
    this.sendProgress({
      type: 'complete',
      projectId,
      message,
    });
  }

  /**
   * Send message to all clients connected for a specific user
   */
  sendToUser(userId: string, message: any) {
    const userClientSet = this.userClients.get(userId);
    if (!userClientSet || userClientSet.size === 0) {
      return;
    }

    const payload = JSON.stringify(message);

    userClientSet.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Get number of connected clients for a project
   */
  getClientCount(projectId: string): number {
    return this.clients.get(projectId)?.size || 0;
  }

  /**
   * Get number of connected clients for a user
   */
  getUserClientCount(userId: string): number {
    return this.userClients.get(userId)?.size || 0;
  }

  /**
   * Close all connections
   */
  close() {
    if (this.wss) {
      this.wss.close();
    }
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
