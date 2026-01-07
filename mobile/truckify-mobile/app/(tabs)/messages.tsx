import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { chatService, Chat, ChatMessage } from '../../src/services/chat';
import { useAuth } from '../../src/contexts/AuthContext';

// Mock data for demo
const MOCK_CHATS: Chat[] = [
  { id: '1', participantId: 'u1', participantName: 'John Smith', participantType: 'shipper', participantPublicKey: 'pk_john_smith_123', lastMessage: 'What\'s your ETA?', lastMessageTime: '2 min ago', unreadCount: 2, jobId: '123' },
  { id: '2', participantId: 'u2', participantName: 'ABC Logistics', participantType: 'dispatcher', participantPublicKey: 'pk_abc_logistics_456', lastMessage: 'New job available in your area', lastMessageTime: '1 hour ago', unreadCount: 0 },
  { id: '3', participantId: 'u3', participantName: 'Sarah Wilson', participantType: 'shipper', participantPublicKey: 'pk_sarah_wilson_789', lastMessage: 'Thanks for the delivery!', lastMessageTime: 'Yesterday', unreadCount: 0, jobId: '456' },
  { id: '4', participantId: 'u4', participantName: 'Metro Dispatch', participantType: 'dispatcher', participantPublicKey: 'pk_metro_dispatch_012', lastMessage: 'Please confirm pickup time', lastMessageTime: '2 days ago', unreadCount: 1 },
];

export default function Messages() {
  const { user, isOnline } = useAuth();
  const [chats, setChats] = useState<Chat[]>(MOCK_CHATS);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    chatService.connect().then(setConnected);
    
    // Listen for new messages to update chat list
    const unsubscribe = chatService.subscribeAll((message) => {
      setChats((prev) => prev.map((chat) => 
        chat.id === message.chatId 
          ? { ...chat, lastMessage: message.content, lastMessageTime: 'Just now', unreadCount: chat.unreadCount + 1 }
          : chat
      ));
    });

    return () => {
      unsubscribe();
      chatService.disconnect();
    };
  }, []);

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shipper': return '📦';
      case 'dispatcher': return '📋';
      case 'driver': return '🚛';
      default: return '👤';
    }
  };

  if (selectedChat) {
    return (
      <ChatScreen 
        chat={selectedChat} 
        onBack={() => setSelectedChat(null)} 
        userId={user?.id || ''} 
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {totalUnread > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{totalUnread}</Text></View>
        )}
        <View style={[styles.connectionDot, { backgroundColor: connected && isOnline ? '#22c55e' : '#ef4444' }]} />
      </View>

      {/* Chat List */}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem} onPress={() => setSelectedChat(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getTypeIcon(item.participantType)}</Text>
            </View>
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{item.participantName}</Text>
                <Text style={styles.chatTime}>{item.lastMessageTime}</Text>
              </View>
              <View style={styles.chatPreview}>
                <Text style={[styles.chatMessage, item.unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount}</Text></View>
                )}
              </View>
              {item.jobId && <Text style={styles.jobTag}>Job #{item.jobId}</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
      />
    </View>
  );
}

// Chat Screen Component
function ChatScreen({ chat, onBack, userId }: { chat: Chat; onBack: () => void; userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', chatId: chat.id, senderId: chat.participantId, senderName: chat.participantName, content: 'Hi, I have a question about the delivery', timestamp: '10:30 AM', read: true, encrypted: true },
    { id: '2', chatId: chat.id, senderId: userId, senderName: 'You', content: 'Sure, how can I help?', timestamp: '10:32 AM', read: true, encrypted: true },
    { id: '3', chatId: chat.id, senderId: chat.participantId, senderName: chat.participantName, content: chat.lastMessage, timestamp: '10:35 AM', read: false, encrypted: true },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(!!chat.participantPublicKey);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsubscribe = chatService.subscribe(chat.id, (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Mark messages as read
    chatService.markAsRead(chat.id, messages.filter(m => !m.read).map(m => m.id));

    return unsubscribe;
  }, [chat.id]);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      chatId: chat.id,
      senderId: userId,
      senderName: 'You',
      content: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true,
      encrypted: isEncrypted,
    };

    setMessages((prev) => [...prev, newMessage]);
    chatService.sendMessage(chat.id, inputText.trim(), chat.participantPublicKey);
    setInputText('');

    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (text && !isTyping) {
      setIsTyping(true);
      chatService.sendTyping(chat.id, true);
    } else if (!text && isTyping) {
      setIsTyping(false);
      chatService.sendTyping(chat.id, false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* Chat Header */}
      <View style={styles.chatScreenHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{chat.participantName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.chatHeaderType}>{chat.participantType}</Text>
            {isEncrypted && <Text style={{ fontSize: 12 }}>🔒</Text>}
          </View>
        </View>
      </View>

      {/* Encryption Banner */}
      {isEncrypted && (
        <View style={{ backgroundColor: '#065f46', padding: 8, alignItems: 'center' }}>
          <Text style={{ color: '#a7f3d0', fontSize: 12 }}>🔐 End-to-end encrypted • 3-way key escrow</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isMe = item.senderId === userId;
          return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
              <Text style={[styles.messageText, isMe && styles.myMessageText]}>{item.content}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>{item.timestamp}</Text>
                {item.encrypted && <Text style={{ fontSize: 10 }}>🔒</Text>}
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#6b7280"
          value={inputText}
          onChangeText={handleTyping}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} onPress={sendMessage} disabled={!inputText.trim()}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', flex: 1 },
  badge: { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  connectionDot: { width: 10, height: 10, borderRadius: 5 },
  chatItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 24 },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  chatTime: { fontSize: 12, color: '#6b7280' },
  chatPreview: { flexDirection: 'row', alignItems: 'center' },
  chatMessage: { flex: 1, fontSize: 14, color: '#9ca3af' },
  unreadMessage: { color: '#fff', fontWeight: '500' },
  unreadBadge: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  jobTag: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: '#6b7280', fontSize: 16 },
  // Chat Screen
  chatScreenHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { marginRight: 12 },
  backText: { color: '#3b82f6', fontSize: 18 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 18, fontWeight: '600', color: '#fff' },
  chatHeaderType: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  messageList: { padding: 16, paddingBottom: 8 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#1f2937', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, color: '#fff' },
  myMessageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: '#9ca3af', marginTop: 4, alignSelf: 'flex-end' },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#1f2937', alignItems: 'flex-end' },
  textInput: { flex: 1, backgroundColor: '#1f2937', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#fff', maxHeight: 100, marginRight: 8 },
  sendButton: { backgroundColor: '#3b82f6', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  sendButtonDisabled: { backgroundColor: '#374151' },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});
