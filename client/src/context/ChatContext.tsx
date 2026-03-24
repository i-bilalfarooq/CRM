"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

interface Chat {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  body: string;
  from: string;
  to: string;
  timestamp: string;
  isIncoming: boolean;
  contactId?: string;
  type?: string;
  mediaUrl?: string;
  fileName?: string;
  fileMimeType?: string;
}

interface ChatContextType {
  chats: Chat[];
  messages: Message[];
  selectedChat: Chat | null;
  status: string; // <-- New status property
  selectChat: (chat: Chat) => void;
  sendMessage: (to: string, body: string) => void;
  syncChatHistory: (contactId: string) => Promise<{ success: boolean; addedCount: number }>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>('initializing'); // <-- Track backend sync status

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3002/api/chats');
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error('Failed to fetch chats', error);
    }
  }, []);

  useEffect(() => {
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      setMessages(prev => {
        if (selectedChat?.id === message.contactId) {
          if (!prev.some(m => m.id === message.id)) {
            return [...prev, message];
          }
        }
        return prev;
      });

      const displayText = message.body || message.fileName || '📎 Media';
      setChats(prev => {
        const chatIndex = prev.findIndex(c => c.id === message.contactId);
        if (chatIndex > -1) {
          const newChats = [...prev];
          const chat = newChats[chatIndex];
          newChats.splice(chatIndex, 1);
          newChats.unshift({
            ...chat,
            lastMessage: displayText,
            lastMessageTime: message.timestamp,
            unreadCount: (selectedChat?.id !== message.contactId && message.isIncoming)
              ? chat.unreadCount + 1
              : chat.unreadCount,
          });
          return newChats;
        }
        return prev;
      });
    };

    const handleChatUpdated = (update: {
      contactId: string; name: string; phone: string;
      lastMessage: string; lastMessageTime: string;
    }) => {
      setChats(prev => {
        const exists = prev.some(c => c.id === update.contactId);
        if (!exists) {
          return [{
            id: update.contactId,
            name: update.name,
            phone: update.phone,
            lastMessage: update.lastMessage,
            lastMessageTime: update.lastMessageTime,
            unreadCount: 1,
          }, ...prev];
        }
        return prev;
      });
    };

    // Listen for backend syncing status
    const handleStatus = (newStatus: string) => {
      setStatus(newStatus);
      if (newStatus === 'ready') {
        fetchChats(); // Refresh the list automatically once sync finishes
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('chat_updated', handleChatUpdated);
    socket.on('whatsapp_status', handleStatus);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('chat_updated', handleChatUpdated);
      socket.off('whatsapp_status', handleStatus);
    };
  }, [socket, selectedChat, fetchChats]);

  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));

    try {
      const response = await fetch(`http://localhost:3002/api/messages/${chat.id}`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  };

  const sendMessage = (to: string, body: string) => {
    socket?.emit('send_message', { to, body });
  };

  const syncChatHistory = async (contactId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/api/chats/${contactId}/sync`, { method: 'POST' });
      const data = await response.json();
      if (data.success && selectedChat?.id === contactId) {
        const msgResponse = await fetch(`http://localhost:3002/api/messages/${contactId}`);
        const msgData = await msgResponse.json();
        setMessages(msgData);
      }
      return data;
    } catch (error) {
      console.error('Failed to sync history', error);
      throw error;
    }
  };

  return (
    <ChatContext.Provider value={{ chats, messages, selectedChat, status, selectChat, sendMessage, syncChatHistory }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};