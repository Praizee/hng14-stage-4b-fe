import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/sidebar/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Sidebar />
      <main className="flex flex-1 flex-col min-w-0">{children}</main>
    </AppShell>
  );
}
