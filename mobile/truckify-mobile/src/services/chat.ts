import { useEffect, useRef, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { e2eEncryption, EncryptedChatMessage } from './encryption';

const WS_URL = 'ws://10.0.10.214:8014/ws';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
  encrypted?: boolean;
}

export interface Chat {
  id: string;
  participantId: string;
  participantName: string;
  participantType: 'shipper' | 'driver' | 'dispatcher';
  participantPublicKey?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  jobId?: string;
}

type MessageHandler = (message: ChatMessage) => void;

class ChatService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;

  async connect(): Promise<boolean> {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return false;

    // Initialize E2E encryption
    await e2eEncryption.initialize();

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(`${WS_URL}?token=${token}`);

        this.ws.onopen = () => {
          console.log('Chat connected');
          this.reconnectAttempts = 0;
          // Share our public key
          this.sharePublicKey();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'message') {
              this.handleIncomingMessage(data.payload);
            } else if (data.type === 'public_key') {
              // Cache participant's public key
              e2eEncryption.cachePublicKey(data.userId, data.publicKey);
            }
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        this.ws.onclose = () => {
          console.log('Chat disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('Chat error:', error);
          resolve(false);
        };
      } catch (error) {
        console.error('Failed to connect:', error);
        resolve(false);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay) as unknown as NodeJS.Timeout;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private sharePublicKey() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const publicKey = e2eEncryption.getPublicKey();
    if (publicKey) {
      this.ws.send(JSON.stringify({
        type: 'public_key',
        payload: { publicKey },
      }));
    }
  }

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  private handleIncomingMessage(data: any) {
    let message: ChatMessage;

    // Check if message is encrypted
    if (data.encrypted && data.encryptedPayload) {
      try {
        const isSender = data.senderId === this.currentUserId;
        const decrypted = e2eEncryption.decryptMessage(data.encryptedPayload, isSender);
        message = { ...data, content: decrypted, encrypted: true };
      } catch (e) {
        console.error('Failed to decrypt:', e);
        message = { ...data, content: '[Encrypted message - unable to decrypt]', encrypted: true };
      }
    } else {
      message = data;
    }

    const handlers = this.messageHandlers.get(message.chatId) || [];
    const globalHandlers = this.messageHandlers.get('*') || [];
    [...handlers, ...globalHandlers].forEach((handler) => handler(message));
  }

  subscribe(chatId: string, handler: MessageHandler): () => void {
    const handlers = this.messageHandlers.get(chatId) || [];
    handlers.push(handler);
    this.messageHandlers.set(chatId, handlers);

    return () => {
      const updated = this.messageHandlers.get(chatId)?.filter((h) => h !== handler) || [];
      this.messageHandlers.set(chatId, updated);
    };
  }

  subscribeAll(handler: MessageHandler): () => void {
    return this.subscribe('*', handler);
  }

  sendMessage(chatId: string, content: string, recipientPublicKey?: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    // Encrypt if we have recipient's public key
    if (recipientPublicKey && e2eEncryption.isReady()) {
      const encrypted = e2eEncryption.encryptMessage(content, recipientPublicKey);
      this.ws.send(JSON.stringify({
        type: 'message',
        payload: { chatId, encrypted: true, encryptedPayload: encrypted },
      }));
    } else {
      // Fallback to unencrypted
      this.ws.send(JSON.stringify({
        type: 'message',
        payload: { chatId, content },
      }));
    }

    return true;
  }

  sendTyping(chatId: string, isTyping: boolean) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'typing',
      payload: { chatId, isTyping },
    }));
  }

  markAsRead(chatId: string, messageIds: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'read',
      payload: { chatId, messageIds },
    }));
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const chatService = new ChatService();

// React hook for chat
export function useChat(chatId: string, recipientPublicKey?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);

  useEffect(() => {
    chatService.connect().then((connected) => {
      setIsConnected(connected);
      setIsEncrypted(e2eEncryption.isReady() && !!recipientPublicKey);
    });

    const unsubscribe = chatService.subscribe(chatId, (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      unsubscribe();
    };
  }, [chatId, recipientPublicKey]);

  const sendMessage = useCallback((content: string) => {
    return chatService.sendMessage(chatId, content, recipientPublicKey);
  }, [chatId, recipientPublicKey]);

  return { messages, sendMessage, isConnected, isEncrypted };
}
