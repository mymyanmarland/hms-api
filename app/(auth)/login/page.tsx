import { LoginForm } from "./_components/login-form";
import { AuthImagePanel } from "./_components/auth-image-panel";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0d18] text-slate-100">
      {/* Soft page-level ambient background so the card floats on something */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(30, 41, 59, 0.4) 0%, rgba(10, 13, 24, 1) 60%)",
        }}
      />

      {/* Main split card */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 md:py-12">
        <div className="relative w-full max-w-[1000px] overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0c0f1a] shadow-[0_25px_80px_-20px_rgba(0,0,0,0.7)] animate-card-rise">
          {/* Top inner highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
            {/* LEFT — Image / brand column */}
            <div className="relative hidden min-h-[560px] md:block">
              <AuthImagePanel />
            </div>

            {/* RIGHT — Form column */}
            <div className="relative bg-[#0c0f1a] px-6 py-7 sm:px-10 sm:py-9 md:px-12 md:py-10">
              <LoginForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
