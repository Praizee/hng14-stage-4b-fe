"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { EncryptedPayload, WsEvent } from "@/types";
import * as api from "@/lib/api";
import { useAuth } from "./AuthContext";
import { useCrypto } from "./CryptoContext";

type Handler = (event: WsEvent) => void;

interface WebSocketContextValue {
  connected: boolean;
  onlineUsers: Set<string>;
  sendMessage: (to: string, payload: EncryptedPayload) => boolean;
  subscribe: (handler: Handler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// Close codes
const CLOSE_TOKEN_EXPIRED = 4001;
const CLOSE_TOKEN_INVALID = 4003;

// Refresh proactively 2 minutes before the 15-minute expiry
const PROACTIVE_REFRESH_MS = 13 * 60 * 1000;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { privateKey } = useCrypto();

  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<Handler>>(new Set());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const intentionalCloseRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  function clearTimers() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
  }

  function scheduleProactiveRefresh() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          const { access_token } = (await res.json()) as {
            access_token: string;
          };
          api.setAccessToken(access_token);
          // Reconnect with new token
          connect();
        }
      } catch {
        // Will reconnect via 4001 close code
      }
    }, PROACTIVE_REFRESH_MS);
  }

  const connect = useCallback(() => {
    // Close any existing connection intentionally before reconnecting
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
    }

    const url = api.getWebSocketUrl();
    if (!url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    intentionalCloseRef.current = false;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelayRef.current = 1000; // reset backoff
      scheduleProactiveRefresh();
    };

    ws.onmessage = (event) => {
      let parsed: WsEvent;
      try {
        parsed = JSON.parse(event.data as string) as WsEvent;
      } catch {
        return;
      }

      // Update presence state locally
      if (parsed.event === "user.online") {
        setOnlineUsers((prev) => new Set([...prev, parsed.user_id]));
      } else if (parsed.event === "user.offline") {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(parsed.user_id);
          return next;
        });
      }

      // Dispatch to all subscribers
      handlersRef.current.forEach((h) => h(parsed));
    };

    ws.onclose = async (event) => {
      setConnected(false);
      clearTimeout(refreshTimerRef.current!);

      if (intentionalCloseRef.current) return;

      if (event.code === CLOSE_TOKEN_INVALID) {
        // Token was tampered — force logout immediately
        await logout();
        return;
      }

      if (event.code === CLOSE_TOKEN_EXPIRED) {
        // Try to refresh and reconnect
        try {
          const res = await fetch("/api/auth/refresh", { method: "POST" });
          if (res.ok) {
            const { access_token } = (await res.json()) as {
              access_token: string;
            };
            api.setAccessToken(access_token);
            connect();
            return;
          }
        } catch {
          // fall through to logout
        }
        await logout();
        return;
      }

      // Any other close: reconnect with exponential backoff (max 30s)
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, 30_000);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onclose fires after onerror, so reconnect logic is handled there
    };
  }, [logout]); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect when user is authenticated and keys are loaded
  useEffect(() => {
    if (!user || !privateKey) return;

    connect();

    return () => {
      clearTimers();
      intentionalCloseRef.current = true;
      wsRef.current?.close();
      setConnected(false);
    };
  }, [user?.id, !!privateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    (to: string, payload: EncryptedPayload): boolean => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ event: "message.send", to, payload }));
      return true;
    },
    [],
  );

  const subscribe = useCallback((handler: Handler) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  return (
    <WebSocketContext.Provider
      value={{ connected, onlineUsers, sendMessage, subscribe }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx)
    throw new Error("useWebSocket must be used within WebSocketProvider");
  return ctx;
}

