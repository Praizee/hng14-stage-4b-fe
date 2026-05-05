"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/contexts/ConversationsContext";
import { ConversationItem, getAvatarColor } from "./ConversationItem";
import { UserSearch } from "./UserSearch";

export function Sidebar() {
  const { user, logout } = useAuth();
  const { conversations, loading } = useConversations();
  const [searching, setSearching] = useState(false);

  const initials = user?.display_name.charAt(0).toUpperCase() ?? "?";
  const avatarColor = user ? getAvatarColor(user.id) : "bg-zinc-700";

  return (
    <>
      {searching && <UserSearch onClose={() => setSearching(false)} />}

      <aside className="flex w-[320px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-800">
          <button
            onClick={logout}
            title={`Signed in as ${user?.username ?? ""}`}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-80 ${avatarColor}`}
          >
            {initials}
          </button>
          <span className="flex-1 text-sm font-semibold text-zinc-100">
            WhisperBox
          </span>
          <button
            onClick={() => setSearching(true)}
            title="New conversation"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
          </button>
        </div>

        {/* Search bar (static, opens modal on focus) */}
        <button
          onClick={() => setSearching(true)}
          className="mx-3 mt-3 mb-2 flex items-center gap-2 rounded-lg bg-zinc-800/70 px-3 py-2 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 shrink-0"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          Search…
        </button>

        {/* Conversation list */}
        <div className="flex flex-1 flex-col overflow-y-auto py-1">
          {loading && conversations.length === 0 && (
            <div className="flex flex-col gap-1 px-3 py-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="h-10 w-10 rounded-full bg-zinc-800 animate-pulse" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-3 w-24 rounded bg-zinc-800 animate-pulse" />
                    <div className="h-2.5 w-36 rounded bg-zinc-800/70 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-zinc-500">No conversations yet</p>
              <button
                onClick={() => setSearching(true)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Find someone to message
              </button>
            </div>
          )}

          {conversations.map((convo) => (
            <ConversationItem key={convo.user_id} conversation={convo} />
          ))}
        </div>
      </aside>
    </>
  );
}
