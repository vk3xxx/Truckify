import { chatService, ChatMessage } from '../services/chat';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    setTimeout(() => this.onopen?.(), 10);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 0;
    this.onclose?.();
  }

  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

(global as any).WebSocket = MockWebSocket;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve('test-token')),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../services/encryption', () => ({
  e2eEncryption: {
    initialize: jest.fn(() => Promise.resolve()),
    isReady: jest.fn(() => true),
    getPublicKey: jest.fn(() => 'public-key-123'),
    encryptMessage: jest.fn((text) => ({
      ciphertext: 'encrypted-' + text,
      iv: 'iv123',
      sessionKey: { forSender: 's', forRecipient: 'r', forAdmin: 'a' },
    })),
    decryptMessage: jest.fn(() => 'decrypted message'),
    cachePublicKey: jest.fn(),
  },
}));

describe('Chat Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('connect establishes WebSocket connection', async () => {
    const connected = await chatService.connect();
    expect(connected).toBe(true);
  });

  test('subscribe registers message handler', () => {
    const handler = jest.fn();
    const unsubscribe = chatService.subscribe('chat-1', handler);

    expect(typeof unsubscribe).toBe('function');
  });

  test('unsubscribe removes handler', () => {
    const handler = jest.fn();
    const unsubscribe = chatService.subscribe('chat-1', handler);
    unsubscribe();
    // Handler should be removed (no error thrown)
  });

  test('sendMessage returns true when connected', async () => {
    await chatService.connect();
    const sent = chatService.sendMessage('chat-1', 'Hello');
    expect(sent).toBe(true);
  });

  test('sendMessage with encryption', async () => {
    await chatService.connect();
    chatService.sendMessage('chat-1', 'Secret message', 'recipient-public-key');
    // Should encrypt the message
  });

  test('isConnected returns connection status', async () => {
    await chatService.connect();
    expect(chatService.isConnected()).toBe(true);
  });

  test('sendTyping sends typing indicator', async () => {
    await chatService.connect();
    chatService.sendTyping('chat-1', true);
    // Should not throw
  });

  test('markAsRead sends read receipt', async () => {
    await chatService.connect();
    chatService.markAsRead('chat-1', ['msg-1', 'msg-2']);
    // Should not throw
  });

  test('disconnect closes connection', async () => {
    await chatService.connect();
    chatService.disconnect();
    expect(chatService.isConnected()).toBe(false);
  });
});
