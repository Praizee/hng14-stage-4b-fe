"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useCrypto } from "@/contexts/CryptoContext";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { UnlockScreen } from "./UnlockScreen";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { privateKey } = useCrypto();

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-950">
        <svg
          className="h-6 w-6 animate-spin text-zinc-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-label="Loading"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // Session was restored via cookie but private key isn't in memory yet
  if (user && !privateKey) {
    return <UnlockScreen />;
  }

  return (
    <WebSocketProvider>
      <ConversationsProvider>
        <div className="flex h-full">{children}</div>
      </ConversationsProvider>
    </WebSocketProvider>
  );
}
