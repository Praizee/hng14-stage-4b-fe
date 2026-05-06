"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useCrypto } from "@/contexts/CryptoContext";
import * as api from "@/lib/api";
import {
  exportPublicKey,
  generateKeyPair,
  generateSalt,
  wrapPrivateKey,
} from "@/lib/crypto";
import { saveKeyMaterial } from "@/lib/db";

type Step = "form" | "keygen" | "registering";

function PasswordStrength({ password }: { password: string }) {
  const score = getPasswordScore(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "",
    "bg-red-500",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-500",
  ];

  if (!password) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? colors[score] : "bg-zinc-700"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-zinc-500 w-12 text-right">
        {labels[score]}
      </span>
    </div>
  );
}

function getPasswordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { initKeys } = useCrypto();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>("form");

  const isLoading = step !== "form";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    try {
      // Step 1: generate keys client-side
      setStep("keygen");
      const salt = generateSalt();
      let keyPair: CryptoKeyPair, publicKeyB64: string, wrappedPrivateKeyB64: string;
      try {
        keyPair = await generateKeyPair();
        publicKeyB64 = await exportPublicKey(keyPair.publicKey);
        wrappedPrivateKeyB64 = await wrapPrivateKey(keyPair.privateKey, password, salt);
      } catch (e) {
        console.error("[keygen]", e);
        throw new Error("Key generation failed. Please try again.");
      }

      // Step 2: register with server
      setStep("registering");
      const res = await api.register({
        username: username.trim(),
        display_name: displayName.trim() || username.trim(),
        password,
        public_key: publicKeyB64,
        wrapped_private_key: wrappedPrivateKeyB64,
        pbkdf2_salt: salt,
      });

      // Load the private key into memory
      await initKeys(
        res.user.wrapped_private_key,
        res.user.pbkdf2_salt,
        password,
        res.user.public_key,
      );

      // Persist key material in IndexedDB
      await saveKeyMaterial(
        res.user.id,
        res.user.public_key,
        res.user.wrapped_private_key,
        res.user.pbkdf2_salt,
      );

      await setUser(res.user, res.access_token, res.refresh_token);
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
      setStep("form");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">
          Create account
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Your encryption keys are generated on your device.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          id="username"
          label="Username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="alice_92"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          required
        />
        <Input
          id="display_name"
          label="Display name"
          type="text"
          autoComplete="name"
          placeholder="Alice"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={isLoading}
        />
        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          <PasswordStrength password={password} />
        </div>
      </div>

      {/* Key generation status */}
      {step !== "form" && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2.5">
          <svg
            className="h-4 w-4 shrink-0 animate-spin text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm text-blue-300">
            {step === "keygen"
              ? "Generating your encryption keys…"
              : "Creating your account…"}
          </p>
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        Create account
      </Button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

