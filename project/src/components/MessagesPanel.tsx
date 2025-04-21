import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Clock, Check, AlertCircle, Paperclip } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  application_id: string | null;
  attachment_url: string | null;
  sender: {
    nombre: string;
    apellidos: string;
    profile_image_url: string | null;
  };
  receiver: {
    nombre: string;
    apellidos: string;
    profile_image_url: string | null;
  };
}

interface MessagesPanelProps {
  applicationId?: string;
  receiverId: string;
  receiverName: string;
}

export function MessagesPanel({ applicationId, receiverId, receiverName }: MessagesPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error: fetchError } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id(nombre, apellidos, profile_image_url),
            receiver:profiles!receiver_id(nombre, apellidos, profile_image_url)
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq(applicationId ? 'application_id' : 'receiver_id', applicationId || receiverId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        setMessages(data || []);

        // Mark received messages as read
        const unreadMessages = data?.filter(m => 
          m.receiver_id === user.id && !m.read
        ) || [];

        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', unreadMessages.map(m => m.id));
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Error al cargar los mensajes');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: applicationId 
          ? `application_id=eq.${applicationId}`
          : `or(receiver_id.eq.${receiverId},sender_id.eq.${receiverId})`,
      }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: newMessage } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id(nombre, apellidos, profile_image_url),
            receiver:profiles!receiver_id(nombre, apellidos, profile_image_url)
          `)
          .eq('id', payload.new.id)
          .single();

        if (newMessage) {
          setMessages(current => [...current, newMessage]);

          // Mark as read if we're the receiver
          if (newMessage.receiver_id === user.id) {
            await supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMessage.id);
          }

          // Play notification sound if we're the receiver
          if (newMessage.receiver_id === user.id) {
            const audio = new Audio('/notification.mp3');
            audio.play();
          }
        }
      })
      .subscribe();

    // Subscribe to typing indicators
    const typingSubscription = supabase
      .channel('typing')
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.senderId === receiverId) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      typingSubscription.unsubscribe();
    };
  }, [applicationId, receiverId]);

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    supabase
      .channel('typing')
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { senderId: receiverId },
      });

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading file:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !e.currentTarget.hasAttribute('data-file')) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      let attachmentUrl = null;
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput?.files?.length) {
        attachmentUrl = await handleFileUpload(fileInput.files[0]);
      }

      const { error: sendError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: newMessage.trim(),
          application_id: applicationId,
          attachment_url: attachmentUrl,
        });

      if (sendError) throw sendError;
      setNewMessage('');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">
          Mensajes con {receiverName}
        </h3>
      </div>

      {/* Messages list */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500">
            No hay mensajes. ¡Inicia la conversación!
          </div>
        ) : (
          messages.map((message) => {
            const isSender = message.sender_id === receiverId;
            return (
              <div
                key={message.id}
                className={`flex ${isSender ? 'justify-start' : 'justify-end'}`}
              >
                <div className="flex items-end">
                  {isSender && message.sender.profile_image_url && (
                    <img
                      src={message.sender.profile_image_url}
                      alt="Profile"
                      className="h-8 w-8 rounded-full mr-2"
                    />
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isSender
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    {message.attachment_url && (
                      <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center mt-2 text-sm ${
                          isSender ? 'text-indigo-600' : 'text-indigo-200'
                        }`}
                      >
                        <Paperclip className="h-4 w-4 mr-1" />
                        Adjunto
                      </a>
                    )}
                    <div
                      className={`flex items-center justify-end mt-1 text-xs ${
                        isSender ? 'text-gray-500' : 'text-indigo-200'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                      {!isSender && (
                        message.read 
                          ? <Check className="h-3 w-3 ml-1" />
                          : <Clock className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </div>
                  {!isSender && message.sender.profile_image_url && (
                    <img
                      src={message.sender.profile_image_url}
                      alt="Profile"
                      className="h-8 w-8 rounded-full ml-2"
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
        {isTyping && (
          <div className="flex items-center text-gray-500 text-sm">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            Escribiendo...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="file"
            id="file-upload"
            className="sr-only"
            onChange={() => handleSendMessage({ currentTarget: { hasAttribute: () => true } } as any)}
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            <Paperclip className="h-4 w-4" />
          </label>
          <button
            type="submit"
            disabled={sending || uploading || (!newMessage.trim() && !document.getElementById('file-upload')?.files?.length)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {sending || uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}