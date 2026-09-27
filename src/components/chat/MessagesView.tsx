import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Code2,
  Paperclip,
  Phone,
  Video,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Copy,
  Trash2,
  Edit2,
  X,
  FileText,
  Clock,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../../types.ts';
import { apiRequest, uploadMedia } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { socketService } from '../../services/socket.ts';

interface MessagesViewProps {
  initialRecipientId?: number | null;
  onStartCall?: (userId: number, type: 'VOICE' | 'VIDEO') => void;
  onSelectUser?: (username: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  initialRecipientId,
  onStartCall,
  onSelectUser
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Real-time state
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState<boolean | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Message input state
  const [textInput, setTextInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeTitle, setCodeTitle] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    setLoadingConv(true);
    try {
      const res = await apiRequest<Conversation[]>('/chat/conversations');
      if (res.success && res.data) {
        setConversations(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setConversations([]);
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle initialRecipientId prop (e.g. clicked "Message" on profile/friends)
  useEffect(() => {
    if (initialRecipientId && user) {
      handleOpenDirectChat(initialRecipientId);
    }
  }, [initialRecipientId, user]);

  const handleOpenDirectChat = async (recipientId: number) => {
    try {
      const res = await apiRequest<Conversation>(`/chat/conversations/direct/${recipientId}`, {
        method: 'POST',
        body: { recipientId }
      });
      if (res.success && res.data) {
        setActiveConversation(res.data);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to open conversation:', err);
    }
  };

  // Fetch messages when active conversation changes
  const fetchMessages = async (convId: number) => {
    setLoadingMessages(true);
    try {
      const res = await apiRequest<Message[]>(`/chat/conversations/${convId}/messages`);
      if (res.success && res.data) {
        setMessages(Array.isArray(res.data) ? res.data : []);
        setTimeout(scrollToBottom, 100);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);

      // Periodically poll for new messages in conversation
      const interval = setInterval(() => {
        fetchMessages(activeConversation.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeConversation?.id]);

  const otherMember: any =
    (activeConversation as any)?.otherMember ||
    (activeConversation as any)?.otherUser ||
    null;

  // Realtime listeners for incoming messages & typing
  useEffect(() => {
    const unbindMsg = socketService.on('chat:message_received', (data: any) => {
      if (activeConversation && data?.conversationId === activeConversation.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setTimeout(scrollToBottom, 50);
      }
      fetchConversations();
    });

    const unbindTyping = socketService.on('chat:typing', (data: any) => {
      if (activeConversation && data?.conversationId === activeConversation.id && data.userId !== user?.id) {
        setIsOtherUserTyping(!!data.isTyping);
      }
    });

    const unbindPresence = socketService.on('user:presence', (data: any) => {
      if (otherMember && otherMember.user_id === data.userId) {
        setIsOtherOnline(data.isOnline);
      }
    });

    return () => {
      unbindMsg();
      unbindTyping();
      unbindPresence();
    };
  }, [activeConversation?.id, otherMember?.user_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextInput(val);

    if (activeConversation) {
      socketService.send('chat:typing', {
        conversationId: activeConversation.id,
        isTyping: true
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.send('chat:typing', {
          conversationId: activeConversation.id,
          isTyping: false
        });
      }, 2000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation) return;
    if (!textInput.trim() && !codeSnippet.trim() && !attachment) return;

    const messageType = codeSnippet.trim()
      ? 'CODE'
      : attachment
      ? attachment.type.startsWith('image/')
        ? 'IMAGE'
        : 'FILE'
      : 'TEXT';

    const bodyPayload: any = {
      messageType,
      message_type: messageType,
      content: textInput.trim() || null,
      codeSnippet: codeSnippet.trim() || null,
      code_snippet: codeSnippet.trim() || null,
      codeLanguage: codeSnippet.trim() ? codeLanguage : null,
      code_language: codeSnippet.trim() ? codeLanguage : null,
      codeTitle: codeSnippet.trim() ? (codeTitle.trim() || 'snippet') : null,
      code_title: codeSnippet.trim() ? (codeTitle.trim() || 'snippet') : null
    };

    if (attachment) {
      bodyPayload.attachments = [
        {
          fileUrl: attachment.url,
          file_url: attachment.url,
          fileName: attachment.name,
          file_name: attachment.name,
          fileType: attachment.type,
          mime_type: attachment.type,
          fileSize: 1024,
          file_size: 1024
        }
      ];
    }

    try {
      const res = await apiRequest<Message>(`/chat/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        body: bodyPayload
      });

      if (res.success && res.data) {
        setMessages(prev => [...prev, res.data!]);
        setTextInput('');
        setCodeSnippet('');
        setCodeTitle('');
        setShowCodeInput(false);
        setAttachment(null);
        setTimeout(scrollToBottom, 50);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAttachment(true);
      const url = await uploadMedia(file, 'attachments');
      if (url) {
        setAttachment({
          url,
          name: file.name,
          type: file.type || 'application/octet-stream'
        });
      }
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-2">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs h-[calc(100vh-8rem)] flex">
        {/* Left Pane: Conversations List */}
        <div className={`w-full md:w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Messages</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
            </span>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loadingConv ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No active conversations yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">Start a conversation from a friend's profile or the Friends tab!</p>
              </div>
            ) : (
              conversations.map(conv => {
                const partner: any = (conv as any).otherMember || (conv as any).otherUser;
                const isSelected = activeConversation?.id === conv.id;
                const lastMsg = conv.last_message || (conv as any).lastMessage;
                const unread = conv.unread_count || (conv as any).unreadCount || 0;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`p-3.5 flex items-center space-x-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div
                      className="relative shrink-0 cursor-pointer"
                      title="View Profile"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectUser && partner) onSelectUser(partner.username);
                      }}
                    >
                      <img
                        src={partner?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${partner?.username || 'user'}`}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-2 hover:ring-sky-500/50 transition-all"
                      />
                      {partner?.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {partner?.full_name || 'Engineer'}
                        </h4>
                        {lastMsg && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {lastMsg?.message_type === 'CODE'
                          ? '💻 Code snippet'
                          : lastMsg?.content || 'No messages yet'}
                      </p>
                    </div>

                    {unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Conversation Chat */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950/30">
            {/* Chat Header */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1 text-slate-400 hover:text-slate-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={otherMember?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${otherMember?.username || 'user'}`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover cursor-pointer"
                    onClick={() => onSelectUser && otherMember && onSelectUser(otherMember.username)}
                  />
                  {(isOtherOnline ?? otherMember?.isOnline) ? (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  ) : (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-400 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>

                <div className="min-w-0">
                  <h4
                    className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
                    onClick={() => onSelectUser && otherMember && onSelectUser(otherMember.username)}
                  >
                    {otherMember?.full_name || 'Engineer'}
                  </h4>
                  <div className="flex items-center space-x-1 text-[11px] text-slate-400 truncate">
                    <span>@{otherMember?.username || 'engineer'}</span>
                    <span>•</span>
                    <span className={(isOtherOnline ?? otherMember?.isOnline) ? 'text-emerald-500 font-medium' : 'text-slate-400'}>
                      {(isOtherOnline ?? otherMember?.isOnline) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Voice and Video Call */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {onStartCall && otherMember && (
                  <>
                    <button
                      title="Audio Call"
                      onClick={() => onStartCall(otherMember.user_id, 'VOICE')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center space-x-1 text-xs font-semibold shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Voice Call</span>
                    </button>
                    <button
                      title="Video Call"
                      onClick={() => onStartCall(otherMember.user_id, 'VIDEO')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center space-x-1 text-xs font-semibold shadow-xs"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Video Call</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="py-20 text-center text-xs text-slate-400">Loading message history...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 text-xs text-slate-400">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>Send a message or code snippet to start chatting!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start items-end space-x-2'}`}
                    >
                      {!isMe && (
                        <img
                          src={otherMember?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${otherMember?.username || 'user'}`}
                          alt=""
                          onClick={() => onSelectUser && otherMember && onSelectUser(otherMember.username)}
                          title={`View ${otherMember?.full_name || 'Profile'}`}
                          className="w-7 h-7 rounded-full object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-sky-500/50 transition-all mb-1 ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                      )}
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-md sm:max-w-lg rounded-2xl p-3 text-xs leading-relaxed ${
                            isMe
                              ? 'bg-sky-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-slate-700 shadow-xs'
                          }`}
                        >
                        {/* Text Content */}
                        {msg.content && <p className="whitespace-pre-line">{msg.content}</p>}

                        {/* Code Snippet */}
                        {msg.message_type === 'CODE' && (
                          <div className="mt-2 rounded-xl overflow-hidden bg-slate-950 text-slate-100 border border-slate-800 font-mono text-[11px]">
                            <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                              <span>{msg.code_title || 'Code Snippet'} ({msg.code_language || 'code'})</span>
                              <button
                                onClick={() => copyCode(msg.content || '')}
                                className="p-1 hover:text-white flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                            <pre className="p-3 overflow-x-auto max-h-60">
                              <code>{msg.content}</code>
                            </pre>
                          </div>
                        )}

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att: any, idx: number) => (
                              <div key={idx} className="rounded-xl overflow-hidden">
                                {att.file_type?.startsWith('image/') || att.mime_type?.startsWith('image/') ? (
                                  <img src={att.file_url || att.fileUrl} alt="" className="max-h-48 rounded-lg object-cover" />
                                ) : (
                                  <a
                                    href={att.file_url || att.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center space-x-1.5 underline text-[11px]"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{att.file_name || att.fileName}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timestamp & status */}
                      <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && <CheckCheck className="w-3 h-3 text-sky-500" />}
                      </span>
                    </div>
                  </div>
                );
                })
              )}

              {/* Typing indicator bubble */}
              {isOtherUserTyping && (
                <div className="flex items-center space-x-2 text-xs text-slate-400 italic py-1 px-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                  <span>{otherMember?.full_name || 'User'} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input / Composer Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {/* Code Snippet Composer Tray */}
              {showCodeInput && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-sky-600">
                      <Code2 className="w-4 h-4" /> Code Snippet Composer
                    </span>
                    <button onClick={() => setShowCodeInput(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Title (e.g. redis-cache-adapter.ts)"
                      value={codeTitle}
                      onChange={e => setCodeTitle(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                    <select
                      value={codeLanguage}
                      onChange={e => setCodeLanguage(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="typescript">TypeScript</option>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="go">Go</option>
                      <option value="rust">Rust</option>
                      <option value="sql">SQL / MySQL</option>
                    </select>
                  </div>
                  <textarea
                    rows={4}
                    value={codeSnippet}
                    onChange={e => setCodeSnippet(e.target.value)}
                    placeholder="Paste code snippet here..."
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              )}

              {/* Attachment Preview */}
              {attachment && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-sky-500" />
                    <span className="truncate">{attachment.name}</span>
                  </div>
                  <button onClick={() => setAttachment(null)} className="text-slate-400 hover:text-rose-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <button
                  type="button"
                  title="Attach Code"
                  onClick={() => setShowCodeInput(!showCodeInput)}
                  className={`p-2 rounded-xl transition-colors ${
                    showCodeInput
                      ? 'bg-sky-100 dark:bg-sky-950 text-sky-600'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Code2 className="w-5 h-5" />
                </button>

                <label
                  title="Attach File / Image"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Paperclip className="w-5 h-5" />
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>

                <input
                  type="text"
                  placeholder="Type message, press Enter to send..."
                  value={textInput}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500"
                />

                <button
                  type="submit"
                  disabled={!textInput.trim() && !codeSnippet.trim() && !attachment}
                  className="p-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center p-8 text-center text-slate-400 text-xs">
            <div>
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Select a Conversation</h4>
              <p className="text-slate-500 mt-1 max-w-xs">
                Send 1:1 direct messages, share code blocks, and initiate peer-to-peer WebRTC calls.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
