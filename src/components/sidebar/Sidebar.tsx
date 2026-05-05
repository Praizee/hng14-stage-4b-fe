"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/contexts/ConversationsContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { getKeyFingerprint } from "@/lib/crypto";
import { useCrypto } from "@/contexts/CryptoContext";
import { ConversationItem, getAvatarColor } from "./ConversationItem";
import { UserSearch } from "./UserSearch";

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span
      title={connected ? "Connected" : "Reconnecting…"}
      className={`inline-block h-2 w-2 rounded-full transition-colors ${
        connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
      }`}
    />
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const { conversations, loading } = useConversations();
  const { connected } = useWebSocket();
  const { publicKeyB64 } = useCrypto();

  const [searching, setSearching] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const initials = user?.display_name.charAt(0).toUpperCase() ?? "?";
  const avatarColor = user ? getAvatarColor(user.id) : "bg-zinc-700";

  // Load key fingerprint when profile opens
  useEffect(() => {
    if (profileOpen && publicKeyB64 && !fingerprint) {
      getKeyFingerprint(publicKeyB64).then(setFingerprint).catch(() => {});
    }
  }, [profileOpen, publicKeyB64, fingerprint]);

  // Close profile popover on outside click
  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  return (
    <>
      {searching && <UserSearch onClose={() => setSearching(false)} />}

      <aside className="flex w-[320px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
        {/* Header */}
        <div className="relative flex items-center gap-2 px-3 py-3 border-b border-zinc-800">
          {/* Avatar / profile toggle */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              title="Your profile"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-80 ${avatarColor}`}
            >
              {initials}
            </button>

            {/* Profile popover */}
            {profileOpen && (
              <div className="absolute left-0 top-10 z-20 w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor}`}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {user?.display_name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      @{user?.username}
                    </p>
                  </div>
                </div>

                {/* Key fingerprint */}
                <div className="rounded-lg bg-zinc-800 p-3">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Key fingerprint
                  </p>
                  {fingerprint ? (
                    <p className="break-all font-mono text-[10px] leading-relaxed text-zinc-300">
                      {fingerprint}
                    </p>
                  ) : (
                    <div className="h-8 w-full animate-pulse rounded bg-zinc-700" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="mt-3 w-full rounded-lg py-2 text-center text-sm text-red-400 transition-colors hover:bg-zinc-800 hover:text-red-300"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          <span className="flex-1 text-sm font-semibold text-zinc-100">
            WhisperBox
          </span>

          <ConnectionBadge connected={connected} />

          <button
            type="button"
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

        {/* Search bar */}
        <button
          type="button"
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
              {[...Array(5)].map((_, i) => (
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
                type="button"
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
