import type { EncryptedPayload } from "@/types";

// Base64 helpers
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// RSA-OAEP key pair generation
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  return bufferToBase64(spki);
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    base64ToBuffer(b64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"],
  );
}

// PBKDF2 key derivation
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt.buffer);
}

async function deriveWrappingKey(
  password: string,
  saltB64: string,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBuffer(saltB64),
      iterations: 310_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// AES-GCM wrap / unwrap (works for any PKCS8 length — AES-KW requires multiples of 8 bytes)
export async function wrapPrivateKey(
  privateKey: CryptoKey,
  password: string,
  saltB64: string,
): Promise<string> {
  const wrappingKey = await deriveWrappingKey(password, saltB64);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    pkcs8,
  );
  // Prepend IV so unwrap can extract it: [12 bytes IV | ciphertext]
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);
  return bufferToBase64(combined.buffer);
}

export async function unwrapPrivateKey(
  wrappedB64: string,
  password: string,
  saltB64: string,
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(password, saltB64);
  const combined = new Uint8Array(base64ToBuffer(wrappedB64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const pkcs8 = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    ciphertext,
  );
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"],
  );
}

// AES-GCM message encryption
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey,
  senderPublicKey: CryptoKey,
): Promise<EncryptedPayload> {
  const enc = new TextEncoder();

  // Generate a random AES-GCM-256 key for this message
  const messageKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  // Random 96-bit IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the plaintext
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    messageKey,
    enc.encode(plaintext),
  );

  // Export the raw AES key to wrap it
  const rawKey = await crypto.subtle.exportKey("raw", messageKey);

  // Encrypt the AES key for the recipient
  const encryptedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawKey,
  );

  // Encrypt the AES key for ourselves (so we can re-read our sent messages)
  const encryptedKeyForSelf = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPublicKey,
    rawKey,
  );

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
    encryptedKey: bufferToBase64(encryptedKey),
    encryptedKeyForSelf: bufferToBase64(encryptedKeyForSelf),
  };
}

export async function decryptMessage(
  payload: EncryptedPayload,
  privateKey: CryptoKey,
  isSender: boolean,
): Promise<string> {
  // Use the correct wrapped key depending on who is reading
  const encryptedKeyB64 = isSender
    ? payload.encryptedKeyForSelf
    : payload.encryptedKey;

  // Decrypt the AES key
  const rawKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBuffer(encryptedKeyB64),
  );

  // Import the decrypted AES key
  const messageKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  // Decrypt the ciphertext
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(payload.iv) },
    messageKey,
    base64ToBuffer(payload.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}

// Key fingerprint
export async function getKeyFingerprint(publicKeyB64: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    base64ToBuffer(publicKeyB64),
  );
  const hex = bufferToHex(hash);
  // Format as groups of 4 for readability: ABCD EFGH ...
  return (
    hex
      .match(/.{1,4}/g)
      ?.join(" ")
      .toUpperCase() ?? hex
  );
}

