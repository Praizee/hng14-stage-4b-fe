export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        {/* Lock icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-7 w-7 text-white"
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
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            WhisperBox
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            End-to-end encrypted messaging
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}
