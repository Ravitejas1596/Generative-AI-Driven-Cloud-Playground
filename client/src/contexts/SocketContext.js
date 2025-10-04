import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Authentication events
      newSocket.on('authenticated', () => {
        console.log('Socket authenticated');
      });

      newSocket.on('unauthorized', (error) => {
        console.error('Socket authentication failed:', error);
      });

      setSocket(newSocket);

      // Cleanup on unmount or auth change
      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // Close socket if not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, token]);

  const joinProject = (projectId) => {
    if (socket && isConnected) {
      socket.emit('join-project', projectId);
    }
  };

  const leaveProject = (projectId) => {
    if (socket && isConnected) {
      socket.emit('leave-project', projectId);
    }
  };

  const sendDeploymentUpdate = (projectId, data) => {
    if (socket && isConnected) {
      socket.emit('deployment-update', { projectId, ...data });
    }
  };

  const sendChatMessage = (message, context = {}) => {
    if (socket && isConnected) {
      socket.emit('ai-chat', { message, context });
    }
  };

  const value = {
    socket,
    isConnected,
    joinProject,
    leaveProject,
    sendDeploymentUpdate,
    sendChatMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
