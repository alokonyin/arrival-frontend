"use client";

import { useEffect, useState, useRef } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type Message = {
  id: string;
  conversation_id: string;
  sender_type: "STUDENT" | "ADMIN";
  sender_id: string;
  sender_name?: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
};

type Conversation = {
  id: string;
  student_id: string;
  program_id: string;
  subject: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
};

type StudentMessagesProps = {
  studentId: string;
};

export default function StudentMessages({ studentId }: StudentMessagesProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get or create conversation
  useEffect(() => {
    const fetchConversation = async () => {
      if (!API_BASE_URL || !studentId) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/students/${studentId}/conversation`
        );
        if (!res.ok) {
          throw new Error(`Failed to load conversation (${res.status})`);
        }
        const data = await res.json();
        setConversation(data);

        // Fetch messages for this conversation
        if (data.id) {
          await fetchMessages(data.id);
        }
      } catch (err: any) {
        console.error("Conversation error:", err);
        setError(err.message || "Failed to load conversation");
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [studentId]);

  // Fetch messages
  const fetchMessages = async (conversationId: string) => {
    if (!API_BASE_URL) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/conversations/${conversationId}/messages?limit=50&offset=0`
      );
      if (!res.ok) {
        throw new Error(`Failed to load messages (${res.status})`);
      }
      const data = await res.json();
      setMessages(data.messages || []);

      // Mark messages as read
      await markAsRead(conversationId);
    } catch (err: any) {
      console.error("Messages error:", err);
      setError(err.message || "Failed to load messages");
    }
  };

  // Mark messages as read
  const markAsRead = async (conversationId: string) => {
    if (!API_BASE_URL) return;

    try {
      await fetch(
        `${API_BASE_URL}/api/conversations/${conversationId}/mark-read?reader_type=STUDENT`,
        { method: "POST" }
      );
    } catch (err: any) {
      console.error("Mark read error:", err);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!API_BASE_URL || !conversation || !newMessage.trim()) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender_type: "STUDENT",
            sender_id: studentId,
            content: newMessage.trim(),
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to send message (${res.status})`);
      }

      // Clear input and refresh messages
      setNewMessage("");
      await fetchMessages(conversation.id);
    } catch (err: any) {
      console.error("Send message error:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-sm text-slate-500">Loading messages...</p>
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg
              className="w-16 h-16 text-slate-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm text-slate-500 mb-1">No messages yet</p>
            <p className="text-xs text-slate-400">
              Send a message to start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isStudent = msg.sender_type === "STUDENT";
            return (
              <div
                key={msg.id}
                className={`flex ${isStudent ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    isStudent
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {!isStudent && msg.sender_name && (
                    <p className="text-xs font-medium text-slate-600 mb-1">
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isStudent ? "text-blue-200" : "text-slate-500"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-slate-200 pt-4">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Need help? Message your program admin here anytime.
        </p>
      </div>
    </div>
  );
}
