export default function AppPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-zinc-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-8 w-8 text-zinc-500"
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
        <p className="text-sm font-medium text-zinc-400">WhisperBox</p>
        <p className="mt-0.5 text-xs text-zinc-600">
          Select a conversation or search for someone to start chatting.
        </p>
      </div>
    </div>
  );
}
