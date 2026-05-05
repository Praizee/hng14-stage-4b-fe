import type {
  AuthResponse,
  ConversationSummary,
  LoginRequest,
  Message,
  RegisterRequest,
  SendMessageRequest,
  User,
  UserPublicInfo,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://whisperbox.koyeb.app";

// In-memory token store — never written to localStorage
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

// Public key cache — avoids redundant fetches within a session
const publicKeyCache = new Map<string, string>();

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

// Core fetch wrapper
async function request<T>(
  path: string,
  options: RequestInit = {},
  skipAuth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (!skipAuth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      const retried = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
      });
      if (!retried.ok) throw await parseError(retried);
      return retried.json() as Promise<T>;
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) throw await parseError(res);

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

async function parseError(res: Response): Promise<Error> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return new Error(body.detail);
    if (Array.isArray(body.detail)) {
      return new Error(
        body.detail.map((e: { msg: string }) => e.msg).join(", "),
      );
    }
  } catch {
    // fall through
  }
  return new Error(`Request failed (${res.status})`);
}

// Token refresh
async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async (): Promise<string | null> => {
    try {
      // Fetch refresh token from our httpOnly cookie via our own route handler
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) {
        clearAccessToken();
        return null;
      }
      const { access_token } = (await res.json()) as { access_token: string };
      setAccessToken(access_token);
      return access_token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Auth endpoints
export async function register(body: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    true,
  );
}

export async function login(body: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    true,
  );
}

export async function getMe(): Promise<User> {
  return request<User>("/auth/me");
}

export async function logout(refreshToken: string): Promise<void> {
  return request<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

// User endpoints
export async function searchUsers(q: string): Promise<UserPublicInfo[]> {
  return request<UserPublicInfo[]>(`/users/search?q=${encodeURIComponent(q)}`);
}

export async function getPublicKey(userId: string): Promise<string> {
  if (publicKeyCache.has(userId)) return publicKeyCache.get(userId)!;
  const data = await request<{ public_key: string }>(
    `/users/${userId}/public-key`,
  );
  publicKeyCache.set(userId, data.public_key);
  return data.public_key;
}

// Conversation endpoints
export async function getConversations(): Promise<ConversationSummary[]> {
  return request<ConversationSummary[]>("/conversations");
}

export async function getMessages(
  userId: string,
  limit = 50,
  before?: string,
): Promise<Message[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  return request<Message[]>(`/conversations/${userId}/messages?${params}`);
}

// Message endpoints
export async function sendMessage(body: SendMessageRequest): Promise<Message> {
  return request<Message>("/messages", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// WebSocket
export function getWebSocketUrl(): string | null {
  if (!accessToken) return null;
  const wsBase = BASE_URL.replace(/^http/, "ws");
  return `${wsBase}/ws?token=${accessToken}`;
}

