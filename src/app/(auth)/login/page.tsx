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
import { saveKeyMaterial } from "@/lib/db";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { initKeys } = useCrypto();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.login({ username: username.trim(), password });

      await initKeys(
        res.user.wrapped_private_key,
        res.user.pbkdf2_salt,
        password,
        res.user.public_key
      );

      await saveKeyMaterial(
        res.user.id,
        res.user.public_key,
        res.user.wrapped_private_key,
        res.user.pbkdf2_salt
      );

      await setUser(res.user, res.access_token, res.refresh_token);
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">Sign in</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Your messages are encrypted on your device.
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
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Sign in
      </Button>

      <p className="text-center text-sm text-zinc-500">
        New to WhisperBox?{" "}
        <Link
          href="/register"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
