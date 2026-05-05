"use client";

import { useEffect, useRef } from "react";
import type { DecryptedMessage } from "@/types";
import { MessageBubble } from "./MessageBubble";

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) /
      86_400_000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

interface Props {
  messages: DecryptedMessage[];
  currentUserId: string;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function MessageList({
  messages,
  currentUserId,
  loading,
  hasMore,
  onLoadMore,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Intersection observer for "load more" when scrolled to top
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { threshold: 0.1 }
    );
    const el = topRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loading, onLoadMore]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <svg className="h-5 w-5 animate-spin text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-label="Loading">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!loading && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-zinc-500">No messages yet</p>
        <p className="text-xs text-zinc-600">Send a message to start the conversation.</p>
      </div>
    );
  }

  // Group messages by date
  let lastDate = "";
  let lastSenderId = "";

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3">
      {/* Load more trigger */}
      <div ref={topRef} className="h-1" />
      {hasMore && (
        <div className="flex justify-center py-2">
          {loading ? (
            <svg className="h-4 w-4 animate-spin text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <button onClick={onLoadMore} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Load older messages
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {messages.map((msg, i) => {
          const isSent = msg.from_user_id === currentUserId;
          const dateLabel = new Date(msg.created_at).toDateString();
          const showDate = dateLabel !== lastDate;
          const isNewSender = msg.from_user_id !== lastSenderId;
          // Show tail on last message in a consecutive block
          const nextMsg = messages[i + 1];
          const showTail = !nextMsg || nextMsg.from_user_id !== msg.from_user_id;

          lastDate = dateLabel;
          lastSenderId = msg.from_user_id;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center justify-center py-3">
                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] text-zinc-400">
                    {formatDateLabel(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={isNewSender ? "mt-2" : "mt-0.5"}>
                <MessageBubble
                  message={msg}
                  isSent={isSent}
                  showTail={showTail}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
