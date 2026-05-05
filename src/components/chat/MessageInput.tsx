"use client";

import { useRef, useState } from "react";

interface Props {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText("");
      // Reset textarea height
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    // Auto-grow textarea up to ~6 lines
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }

  const canSend = text.trim().length > 0 && !sending && !disabled;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="flex items-end gap-2 rounded-2xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 focus-within:border-zinc-600">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          className="max-h-36 flex-1 resize-none bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-all disabled:opacity-30 enabled:hover:bg-blue-500"
        >
          {sending ? (
            <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.903 6.557H10.5a.75.75 0 010 1.5H4.182l-1.903 6.557a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.114A28.897 28.897 0 003.105 2.289z" />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-zinc-600">
        Messages are end-to-end encrypted
      </p>
    </div>
  );
}
