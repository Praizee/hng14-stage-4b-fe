"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ConversationSummary } from "@/types";
import * as api from "@/lib/api";
import { useAuth } from "./AuthContext";

interface ConversationsContextValue {
  conversations: ConversationSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
  upsert: (convo: ConversationSummary) => void;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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

  // Update or insert a conversation (called when a new message arrives)
  const upsert = useCallback((convo: ConversationSummary) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.user_id === convo.user_id);
      if (idx === -1) return [convo, ...prev];
      const next = [...prev];
      next[idx] = convo;
      return next.sort((a, b) => {
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    });
  }, []);

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
