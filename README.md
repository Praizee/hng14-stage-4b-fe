# WhisperBox

End-to-end encrypted messaging. The server never sees plaintext — all encryption and decryption happens on your device.

## Running locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The backend is hosted at `https://whisperbox.koyeb.app`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────────────────┐    │
│  │   Auth pages    │        │         App shell             │    │
│  │  /login         │        │  ┌────────────┐  ┌────────┐  │    │
│  │  /register      │        │  │  Sidebar   │  │  Chat  │  │    │
│  │                 │        │  │            │  │  pane  │  │    │
│  │  Key generation │        │  │  Convos    │  │        │  │    │
│  │  Key wrapping   │        │  │  Search    │  │ Bubbles│  │    │
│  └────────┬────────┘        │  └────────────┘  └────────┘  │    │
│           │                 └──────────────┬───────────────┘    │
│           │                                │                     │
│  ┌────────▼────────────────────────────────▼───────────────┐    │
│  │                     Crypto layer                         │    │
│  │  Web Crypto API · RSA-OAEP-2048 · AES-GCM-256 · PBKDF2 │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │                                     │
│  ┌──────────────────────────▼──────────────────────────────┐    │
│  │                     IndexedDB                            │    │
│  │   wrapped_private_key · pbkdf2_salt · public_key         │    │
│  │   (private key never stored in plaintext)                │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────▼──────────────────────────────────┐
│                   WhisperBox backend (koyeb)                     │
│                                                                  │
│   /auth/*   /users/*   /conversations/*   /messages   /ws        │
│                                                                  │
│   Stores only: ciphertext · iv · encryptedKey ·                  │
│                encryptedKeyForSelf · wrapped_private_key          │
│   Never sees: plaintext · raw private keys · passwords           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Encryption flow

### Registration

```
1. Browser generates RSA-OAEP-2048 key pair  (Web Crypto API)
2. Browser generates a random 128-bit PBKDF2 salt
3. Derive wrapping key:  password + salt  →  PBKDF2  →  AES-KW-256
4. Wrap private key:     RSA private key  →  AES-KW  →  wrapped blob
5. Export public key as base64 (SPKI format)
6. POST /auth/register  { public_key, wrapped_private_key, pbkdf2_salt, ... }
   Server stores the blobs verbatim — it cannot read the private key
7. Private key is unwrapped into memory (CryptoKey object, non-exportable)
```

### Login / session restore

```
1. POST /auth/login  →  server returns { wrapped_private_key, pbkdf2_salt }
2. Re-derive AES-KW wrapping key:  password + salt  →  PBKDF2
3. Unwrap private key into memory  (never written to disk)
4. On page refresh:  access token refreshed via httpOnly cookie,
   user prompted for password to re-derive and unwrap the key
```

### Sending a message

```
1. GET /users/{recipientId}/public-key  (cached per session)
2. Generate random AES-GCM-256 key  (per message)
3. Generate random 96-bit IV
4. Encrypt plaintext:      plaintext + IV  →  AES-GCM  →  ciphertext
5. Encrypt AES key × 2:
     AES key + recipient's RSA public key  →  RSA-OAEP  →  encryptedKey
     AES key + sender's own RSA public key →  RSA-OAEP  →  encryptedKeyForSelf
6. Send via WebSocket (or REST fallback):
     { to, payload: { ciphertext, iv, encryptedKey, encryptedKeyForSelf } }
```

### Receiving a message

```
1. Receive payload via WebSocket (message.receive event) or GET /conversations/{id}/messages
2. Determine role:
     recipient  →  decrypt encryptedKey    with own RSA private key
     sender     →  decrypt encryptedKeyForSelf  with own RSA private key
3. Recovered AES-GCM-256 key + IV  →  decrypt ciphertext  →  plaintext
4. If decryption fails: display "[Message could not be decrypted]"
```

---

## Key management

| Material | Where stored | Plaintext visible to server? |
|---|---|---|
| RSA public key | Backend + IndexedDB | Yes (intentional — needed to encrypt messages for you) |
| RSA private key (wrapped) | Backend + IndexedDB | No — AES-KW encrypted with PBKDF2-derived key |
| RSA private key (unwrapped) | JS memory only | Never sent anywhere |
| PBKDF2 salt | Backend + IndexedDB | Yes — not secret, randomises key derivation |
| Password | Never stored | No |
| Access token | JS memory only | No |
| Refresh token | httpOnly cookie | No — not accessible to JavaScript |

**PBKDF2 parameters:** SHA-256, 310 000 iterations — meets OWASP 2023 recommendation for AES-256 wrapping keys.

**Key fingerprint:** SHA-256 of the SPKI-encoded public key, displayed in the profile panel. Users can compare fingerprints out-of-band to verify they are talking to the right person.

---

## Security trade-offs

| Decision | Trade-off |
|---|---|
| Private key derived from password via PBKDF2 | A weak password weakens key security. Mitigated by enforcing 8+ character minimum and showing a strength indicator. |
| Refresh token in httpOnly cookie | Protects against XSS but is still sent on every request to `/api/auth/refresh`. SameSite=Strict limits CSRF risk. |
| Access token in JS memory | Lost on page refresh — requires re-authentication via cookie or unlock screen. Prevents token theft via localStorage XSS. |
| RSA-OAEP-2048 (not 4096) | Faster key generation and encryption; matches the guide's recommendation. Still provides strong security for this use case. |
| Per-message AES-GCM key | Each message uses a fresh key and IV — compromise of one message key exposes only that message. |
| No forward secrecy (ECDH ratchet) | Simpler implementation; long-term key compromise exposes all past messages. A Signal-protocol double ratchet would address this but is significantly more complex. |
| Optimistic WS send | Sent bubble appears immediately; if the WS frame is lost the message won't be persisted — the REST fallback handles offline state. |

---

## Known limitations

- **No forward secrecy.** Messages are encrypted under the same long-lived RSA key pair. A future implementation could layer an ECDH ratchet (Signal Protocol) on top.
- **No key rotation.** Users cannot regenerate their key pair without losing access to past messages.
- **Password is the root of trust.** If a user forgets their password, their private key is unrecoverable (by design — the server cannot help).
- **No multi-device support.** The private key is device-local. Signing in on a second device generates a new key pair, breaking decryption of messages sent to the first device's public key.
- **Optimistic sends may be lost.** If the WebSocket closes before the frame is acknowledged, the message is dropped. The REST fallback is used when the socket is already known to be closed, but a mid-send disconnect isn't currently retried.
- **No replay protection.** The IV is randomly generated per message; there is no sequence number or session binding to prevent a server-side replay of a captured ciphertext to the same recipient.
