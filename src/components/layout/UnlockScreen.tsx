"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCrypto } from "@/contexts/CryptoContext";
import { useAuth } from "@/contexts/AuthContext";

export function UnlockScreen() {
  const { user, logout } = useAuth();
  const { initKeys } = useCrypto();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setLoading(true);
    try {
      await initKeys(
        user.wrapped_private_key,
        user.pbkdf2_salt,
        password,
        user.public_key
      );
    } catch {
      setError("Incorrect password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6 text-white"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-100">
              Welcome back, {user?.display_name}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Enter your password to unlock your encryption keys.
            </p>
          </div>
        </div>

        <form onSubmit={handleUnlock} className="flex flex-col gap-4">
          <Input
            id="unlock-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            autoFocus
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Unlock
          </Button>
        </form>

        <button
          onClick={logout}
          className="mt-4 w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
