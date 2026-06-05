export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="w-full flex items-center justify-center flex-1">
        {children}
      </div>

      {/* Branding footer */}
      <div className="py-5 flex items-center gap-1.5 text-xs text-gray-700">
        <span>Powered by</span>
        <span className="font-bold tracking-wide text-transparent bg-clip-text"
          style={{ backgroundImage: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          ARLOTECH
        </span>
        <span className="text-gray-800">·</span>
        <span className="italic text-gray-700">UI/UX &amp; Web Developer</span>
      </div>
    </div>
  );
}
