"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ConversationSummary } from "@/types";

const AVATAR_COLORS = [
  "bg-violet-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-teal-600",
];

export function getAvatarColor(userId: string): string {
  let hash = 0;
  for (const ch of userId) hash = ((hash * 31) + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) /
      86_400_000
  );
  if (diffDays === 0)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface Props {
  conversation: ConversationSummary;
}

export function ConversationItem({ conversation }: Props) {
  const pathname = usePathname();
  const isActive = pathname === `/chat/${conversation.user_id}`;
  const initials = conversation.display_name.charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(conversation.user_id);

  return (
    <Link
      href={`/chat/${conversation.user_id}`}
      className={`flex items-center gap-3 px-3 py-3 transition-colors rounded-lg mx-1 ${
        isActive
          ? "bg-zinc-700/60"
          : "hover:bg-zinc-800/60"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor}`}
      >
        {initials}
      </div>

      {/* Text */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-zinc-100">
            {conversation.display_name}
          </span>
          <span className="shrink-0 text-xs text-zinc-500">
            {formatTimestamp(conversation.last_message_at)}
          </span>
        </div>
        <span className="truncate text-xs text-zinc-500">
          {conversation.last_message_at ? "Encrypted message" : "No messages yet"}
        </span>
      </div>
    </Link>
  );
}
