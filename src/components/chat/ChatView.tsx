"use client";

import { useCallback, useEffect, useState } from "react";
import type { DecryptedMessage, Message } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useCrypto } from "@/contexts/CryptoContext";
import { useConversations } from "@/contexts/ConversationsContext";
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
        // API returns newest-first, reverse for display
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
        // leave existing messages
      } finally {
        setLoading(false);
      }
    },
    [userId, currentUserId, decrypt]
  );

  useEffect(() => {
    setMessages([]);
    setCursor(undefined);
    loadMessages();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && cursor) loadMessages(cursor);
  }, [loading, hasMore, cursor, loadMessages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!user || !publicKeyB64) return;

      // Fetch recipient's public key
      const recipientPublicKeyB64 = await api.getPublicKey(userId);
      const payload = await encrypt(text, recipientPublicKeyB64);

      const sent = await api.sendMessage({ to: userId, payload });
      const decrypted: DecryptedMessage = { ...sent, text };

      setMessages((prev) => [...prev, decrypted]);

      // Update conversation list with new timestamp
      upsert({
        user_id: userId,
        display_name: nameHint ?? userId,
        username: "",
        last_message_at: sent.created_at,
      });
    },
    [user, userId, publicKeyB64, encrypt, upsert, nameHint]
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
