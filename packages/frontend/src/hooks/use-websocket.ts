'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket(projectId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('accessToken'),
      },
      query: {
        projectId,
      },
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('job:progress', (data) => {
      setLastMessage({ type: 'job:progress', data });
    });

    socket.on('job:completed', (data) => {
      setLastMessage({ type: 'job:completed', data });
    });

    socket.on('job:failed', (data) => {
      setLastMessage({ type: 'job:failed', data });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [projectId]);

  return {
    isConnected,
    lastMessage,
  };
}
