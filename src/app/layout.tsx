import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CryptoProvider } from "@/contexts/CryptoContext";

export const metadata: Metadata = {
  title: "WhisperBox",
  description: "End-to-end encrypted messaging",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <AuthProvider>
          <CryptoProvider>{children}</CryptoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
