import type { DecryptedMessage } from "@/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  message: DecryptedMessage;
  isSent: boolean;
  showTail: boolean;
}

export function MessageBubble({ message, isSent, showTail }: Props) {
  const failed = message.text === null;

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative max-w-[75%] rounded-2xl px-3.5 py-2 ${
          isSent
            ? `bg-blue-600 text-white ${showTail ? "rounded-br-sm" : ""}`
            : `bg-zinc-800 text-zinc-100 ${showTail ? "rounded-bl-sm" : ""}`
        }`}
      >
        {failed ? (
          <p className="text-xs italic opacity-60">
            Message could not be decrypted
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.text}
          </p>
        )}

        {/* Timestamp + lock */}
        <div
          className={`mt-0.5 flex items-center justify-end gap-1 ${
            isSent ? "text-blue-200" : "text-zinc-500"
          }`}
        >
          <span className="text-[10px]">{formatTime(message.created_at)}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 12 12"
            fill="currentColor"
            className="h-2.5 w-2.5 opacity-70"
            aria-label="Encrypted"
          >
            <path
              fillRule="evenodd"
              d="M6 1a2.625 2.625 0 00-2.625 2.625V4.5a1.125 1.125 0 00-1.125 1.125v3.75A1.125 1.125 0 003.375 10.5h5.25a1.125 1.125 0 001.125-1.125v-3.75A1.125 1.125 0 008.625 4.5V3.625A2.625 2.625 0 006 1zm1.5 3.5V3.625a1.5 1.5 0 00-3 0V4.5h3z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
