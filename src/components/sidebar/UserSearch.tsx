"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserPublicInfo } from "@/types";
import * as api from "@/lib/api";
import { getAvatarColor } from "./ConversationItem";

interface Props {
  onClose: () => void;
}

export function UserSearch({ onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserPublicInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchUsers(trimmed);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  function selectUser(user: UserPublicInfo) {
    router.push(`/chat/${user.id}?name=${encodeURIComponent(user.display_name)}&username=${encodeURIComponent(user.username)}`);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="fixed inset-x-0 top-16 z-50 mx-auto max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 shrink-0 text-zinc-500"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name or username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {loading && (
            <svg
              className="h-4 w-4 animate-spin text-zinc-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {results.length === 0 && query.trim().length > 0 && !loading && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              No users found
            </p>
          )}
          {results.length === 0 && query.trim().length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-zinc-600">
              Type to search for users
            </p>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => selectUser(user)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(user.id)}`}
              >
                {user.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-100">
                  {user.display_name}
                </span>
                <span className="text-xs text-zinc-500">@{user.username}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
