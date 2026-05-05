"use client";

import { useCallback, useEffect, useState } from "react";
import type { DecryptedMessage, Message, WsMessageReceive } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useCrypto } from "@/contexts/CryptoContext";
import { useConversations } from "@/contexts/ConversationsContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import * as api from "@/lib/api";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

interface Props {
  userId: string;
  nameHint?: string;
  usernameHint?: string;
}

async function tryDecrypt(
  msg: Message,
  currentUserId: string,
  decrypt: (payload: Message["payload"], isSender: boolean) => Promise<string>
): Promise<DecryptedMessage> {
  try {
    const isSender = msg.from_user_id === currentUserId;
    const text = await decrypt(msg.payload, isSender);
    return { ...msg, text };
  } catch {
    return { ...msg, text: null };
  }
}

export function ChatView({ userId, nameHint }: Props) {
  const { user } = useAuth();
  const { decrypt, encrypt, publicKeyB64 } = useCrypto();
  const { upsert } = useConversations();
  const { sendMessage: wsSend, subscribe } = useWebSocket();

  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const currentUserId = user?.id ?? "";

  const loadMessages = useCallback(
    async (before?: string) => {
      setLoading(true);
      try {
        const raw = await api.getMessages(userId, 50, before);
        // API returns newest-first; reverse for chronological display
        const reversed = [...raw].reverse();
        const decrypted = await Promise.all(
          reversed.map((m) => tryDecrypt(m, currentUserId, decrypt))
        );
        if (before) {
          setMessages((prev) => [...decrypted, ...prev]);
        } else {
          setMessages(decrypted);
        }
        setHasMore(raw.length === 50);
        if (raw.length > 0) setCursor(raw[raw.length - 1].created_at);
      } catch {
        // leave existing messages intact
      } finally {
        setLoading(false);
      }
    },
    [userId, currentUserId, decrypt]
  );

  // Reload when conversation changes
  useEffect(() => {
    setMessages([]);
    setCursor(undefined);
    loadMessages();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to incoming WS messages for this conversation
  useEffect(() => {
    return subscribe(async (event) => {
      if (event.event !== "message.receive") return;
      const msg = event as WsMessageReceive;

      // Only handle messages in this conversation
      const isThisConvo =
        (msg.from_user_id === userId && msg.to_user_id === currentUserId) ||
        (msg.from_user_id === currentUserId && msg.to_user_id === userId);
      if (!isThisConvo) return;

      // Avoid duplicates (WS may flush undelivered messages on connect)
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return prev; // will be added after decrypt below
      });

      const isSender = msg.from_user_id === currentUserId;
      const decrypted = await tryDecrypt(
        { ...msg, delivered: msg.delivered ?? true },
        currentUserId,
        decrypt
      );

      setMessages((prev) => {
        if (prev.some((m) => m.id === decrypted.id)) return prev;
        return [...prev, decrypted];
      });
    });
  }, [subscribe, userId, currentUserId, decrypt]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && cursor) loadMessages(cursor);
  }, [loading, hasMore, cursor, loadMessages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!user || !publicKeyB64) return;

      const recipientPublicKeyB64 = await api.getPublicKey(userId);
      const payload = await encrypt(text, recipientPublicKeyB64);

      // Prefer WebSocket; fall back to REST if disconnected
      const sentViaWs = wsSend(userId, payload);

      let sentAt = new Date().toISOString();
      if (!sentViaWs) {
        const sent = await api.sendMessage({ to: userId, payload });
        sentAt = sent.created_at;

        // Add REST-sent message to local state
        const decrypted: DecryptedMessage = { ...sent, text };
        setMessages((prev) => [...prev, decrypted]);
      } else {
        // Optimistic update for WS-sent messages
        const optimistic: DecryptedMessage = {
          id: `optimistic-${Date.now()}`,
          from_user_id: currentUserId,
          to_user_id: userId,
          payload,
          delivered: false,
          created_at: sentAt,
          text,
        };
        setMessages((prev) => [...prev, optimistic]);
      }

      upsert({
        user_id: userId,
        display_name: nameHint ?? userId,
        username: "",
        last_message_at: sentAt,
      });
    },
    [user, userId, publicKeyB64, encrypt, wsSend, upsert, currentUserId, nameHint]
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-950">
      <ChatHeader userId={userId} nameHint={nameHint} />
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
      <MessageInput onSend={handleSend} disabled={!user} />
    </div>
  );
}
