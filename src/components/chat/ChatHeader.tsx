"use client";

import Link from "next/link";
import { useConversations } from "@/contexts/ConversationsContext";
import { getAvatarColor } from "@/components/sidebar/ConversationItem";

interface Props {
  userId: string;
  nameHint?: string;
}

export function ChatHeader({ userId, nameHint }: Props) {
  const { conversations } = useConversations();
  const convo = conversations.find((c) => c.user_id === userId);
  const displayName = convo?.display_name ?? nameHint ?? "Unknown";
  const initials = displayName.charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(userId);

  return (
    <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      {/* Mobile back button */}
      <Link
        href="/"
        className="mr-1 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
        aria-label="Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
        </svg>
      </Link>

      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor}`}
      >
        {initials}
      </div>

      {/* Name + encryption indicator */}
      <div className="flex flex-1 flex-col min-w-0">
        <span className="truncate text-sm font-semibold text-zinc-100">
          {displayName}
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3 w-3 text-zinc-500"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M8 1a3.5 3.5 0 00-3.5 3.5V6A1.5 1.5 0 003 7.5v5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5v-5A1.5 1.5 0 0011.5 6V4.5A3.5 3.5 0 008 1zm2 5V4.5a2 2 0 10-4 0V6h4z"
              clipRule="evenodd"
            />
          </svg>
          End-to-end encrypted
        </span>
      </div>
    </header>
  );
}
