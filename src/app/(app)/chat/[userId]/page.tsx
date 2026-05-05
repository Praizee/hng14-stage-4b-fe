import { ChatView } from "@/components/chat/ChatView";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ name?: string; username?: string }>;
}) {
  const { userId } = await params;
  const { name, username } = await searchParams;

  return (
    <ChatView
      userId={userId}
      nameHint={name}
      usernameHint={username}
    />
  );
}
