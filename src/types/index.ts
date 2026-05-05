export interface User {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
  created_at: string;
}

export interface UserPublicInfo {
  id: string;
  username: string;
  display_name: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}

export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  payload: EncryptedPayload;
  delivered: boolean;
  created_at: string;
}

export interface DecryptedMessage extends Message {
  text: string | null;
}

export interface ConversationSummary {
  user_id: string;
  display_name: string;
  username: string;
  last_message_at: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface RegisterRequest {
  username: string;
  display_name: string;
  password: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SendMessageRequest {
  to: string;
  payload: EncryptedPayload;
}

export interface MessagesPage {
  messages: Message[];
  nextCursor: string | null;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface ApiError {
  detail: string | ValidationError[];
}

// WebSocket event types
export interface WsMessageReceive {
  event: "message.receive";
  id: string;
  from_user_id: string;
  to_user_id: string;
  payload: EncryptedPayload;
  created_at: string;
  delivered?: boolean;
}

export interface WsPresence {
  event: "user.online" | "user.offline";
  user_id: string;
}

export interface WsError {
  event: "error";
  detail: string;
}

export type WsEvent = WsMessageReceive | WsPresence | WsError;

