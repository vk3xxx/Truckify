import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { messagingApi, jobsApi, type Conversation, type ChatMessage, type Job } from '../api';
import { useAuth } from '../AuthContext';
import { useWebSocket } from '../WebSocketContext';

export default function Messages() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const [conversations, setConversations] = useState<(Conversation & { job?: Job })[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (lastMessage?.type === 'message' && selectedConv) {
      const msg = lastMessage.payload as ChatMessage;
      if (msg.conversation_id === selectedConv.id) {
        setMessages(prev => [...prev, msg]);
      }
      loadConversations(); // Refresh to update unread counts
    }
  }, [lastMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await messagingApi.getConversations();
      const convs = res.data.data || [];
      
      // Enrich with job details
      const enriched = await Promise.all(convs.map(async (conv) => {
        try {
          const jobRes = await jobsApi.getJob(conv.job_id);
          return { ...conv, job: jobRes.data.data };
        } catch {
          return conv;
        }
      }));
      
      setConversations(enriched);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
    setLoading(false);
  };

  const loadMessages = async (conv: Conversation) => {
    setSelectedConv(conv);
    try {
      const res = await messagingApi.getMessages(conv.id);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await messagingApi.sendMessage(selectedConv.id, newMessage.trim());
      setMessages(prev => [...prev, res.data.data]);
      setNewMessage('');
      loadConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
    setSending(false);
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
  };

  const getOtherParty = (conv: Conversation) => {
    return user?.id === conv.shipper_id ? 'Driver' : 'Shipper';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageCircle className="h-6 w-6" /> Messages
      </h1>

      <div className="grid md:grid-cols-3 gap-4 h-[600px]">
        {/* Conversations List */}
        <div className={`card p-0 overflow-hidden ${selectedConv ? 'hidden md:block' : ''}`}>
          <div className="p-4 border-b border-dark-700">
            <h2 className="font-semibold">Conversations</h2>
          </div>
          <div className="overflow-y-auto h-[calc(100%-60px)]">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">Start a conversation from a job page</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadMessages(conv)}
                  className={`p-4 border-b border-dark-700 cursor-pointer hover:bg-dark-700 transition-colors ${
                    selectedConv?.id === conv.id ? 'bg-dark-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{getOtherParty(conv)}</span>
                    {(conv.unread_count ?? 0) > 0 && (
                      <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  {conv.job && (
                    <p className="text-sm text-gray-400 truncate">
                      {conv.job.pickup.city} → {conv.job.delivery.city}
                    </p>
                  )}
                  {conv.last_message && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {conv.last_message.sender_id === user?.id ? 'You: ' : ''}
                      {conv.last_message.content}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    {formatTime(conv.last_message?.created_at || conv.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div className={`card p-0 md:col-span-2 flex flex-col ${!selectedConv ? 'hidden md:flex' : ''}`}>
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-dark-700 flex items-center gap-3">
                <button onClick={() => setSelectedConv(null)} className="md:hidden text-gray-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <p className="font-semibold">{getOtherParty(selectedConv)}</p>
                  {conversations.find(c => c.id === selectedConv.id)?.job && (
                    <p className="text-sm text-gray-400">
                      {conversations.find(c => c.id === selectedConv.id)?.job?.pickup.city} → {conversations.find(c => c.id === selectedConv.id)?.job?.delivery.city}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.sender_id === user?.id
                            ? 'bg-primary-500 text-white rounded-br-md'
                            : 'bg-dark-700 text-gray-200 rounded-bl-md'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-primary-200' : 'text-gray-500'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-dark-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    className="input-field flex-1"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="btn-primary px-4"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
