"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ConversationSummary, WsMessageReceive } from "@/types";
import * as api from "@/lib/api";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "./WebSocketContext";

interface ConversationsContextValue {
  conversations: ConversationSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
  upsert: (convo: ConversationSummary) => void;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { subscribe } = useWebSocket();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch {
      // silently fail — user sees stale list
    } finally {
      setLoading(false);
    }
  }, []);

  const upsert = useCallback((convo: ConversationSummary) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.user_id === convo.user_id);
      if (idx === -1) return [convo, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...convo };
      return next.sort((a, b) => {
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    });
  }, []);

  // Subscribe to WS events — update conversation list when messages arrive
  useEffect(() => {
    return subscribe((event) => {
      if (event.event !== "message.receive") return;
      const msg = event as WsMessageReceive;
      // The "other" user is whoever isn't us
      const otherId = msg.from_user_id === user?.id ? msg.to_user_id : msg.from_user_id;
      // Bump last_message_at; display_name will be filled from existing entry or refreshed
      upsert({
        user_id: otherId,
        display_name: "",   // will be merged with existing entry in upsert
        username: "",
        last_message_at: msg.created_at,
      });
    });
  }, [subscribe, upsert, user?.id]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  return (
    <ConversationsContext.Provider value={{ conversations, loading, refresh, upsert }}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations(): ConversationsContextValue {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used within ConversationsProvider");
  return ctx;
}
