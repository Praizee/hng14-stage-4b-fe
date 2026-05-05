"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  decryptMessage as cryptoDecrypt,
  encryptMessage as cryptoEncrypt,
  importPublicKey,
  unwrapPrivateKey,
} from "@/lib/crypto";
import type { EncryptedPayload } from "@/types";

interface CryptoContextValue {
  privateKey: CryptoKey | null;
  publicKeyB64: string | null;
  initKeys: (
    wrappedPrivateKey: string,
    pbkdf2Salt: string,
    password: string,
    publicKeyB64: string
  ) => Promise<void>;
  clearKeys: () => void;
  encrypt: (
    plaintext: string,
    recipientPublicKeyB64: string
  ) => Promise<EncryptedPayload>;
  decrypt: (
    payload: EncryptedPayload,
    isSender: boolean
  ) => Promise<string>;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const [publicKeyB64, setPublicKeyB64] = useState<string | null>(null);

  const initKeys = useCallback(
    async (
      wrappedPrivateKey: string,
      pbkdf2Salt: string,
      password: string,
      pkB64: string
    ) => {
      const privKey = await unwrapPrivateKey(wrappedPrivateKey, password, pbkdf2Salt);
      const pubKey = await importPublicKey(pkB64);
      setPrivateKey(privKey);
      setPublicKey(pubKey);
      setPublicKeyB64(pkB64);
    },
    []
  );

  const clearKeys = useCallback(() => {
    setPrivateKey(null);
    setPublicKey(null);
    setPublicKeyB64(null);
  }, []);

  const encrypt = useCallback(
    async (plaintext: string, recipientPublicKeyB64: string) => {
      if (!privateKey || !publicKey) throw new Error("Keys not initialized");
      const recipientKey = await importPublicKey(recipientPublicKeyB64);
      return cryptoEncrypt(plaintext, recipientKey, publicKey);
    },
    [privateKey, publicKey]
  );

  const decrypt = useCallback(
    async (payload: EncryptedPayload, isSender: boolean) => {
      if (!privateKey) throw new Error("Private key not available");
      return cryptoDecrypt(payload, privateKey, isSender);
    },
    [privateKey]
  );

  return (
    <CryptoContext.Provider
      value={{ privateKey, publicKeyB64, initKeys, clearKeys, encrypt, decrypt }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto(): CryptoContextValue {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error("useCrypto must be used within CryptoProvider");
  return ctx;
}
