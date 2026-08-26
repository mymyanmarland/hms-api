import { Quote } from "lucide-react";

export function AuthImagePanel() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Sky gradient — deeper, more cinematic */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0a1226 0%, #16203d 30%, #1a2547 55%, #131c38 80%, #0a1126 100%)",
        }}
      />

      {/* Aurora glow band */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-2/3 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 60% 10%, rgba(99, 102, 241, 0.45) 0%, rgba(56, 189, 248, 0.22) 30%, transparent 65%)",
        }}
      />

      {/* Warm horizon glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-1/3 h-1/2 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(251, 146, 60, 0.35) 0%, rgba(251, 146, 60, 0) 60%)",
        }}
      />

      {/* Moon with halo */}
      <div
        aria-hidden="true"
        className="absolute right-[14%] top-[12%] h-16 w-16 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #fafafa 0%, #e2e8f0 50%, #cbd5e1 90%)",
          boxShadow:
            "0 0 50px 8px rgba(226, 232, 240, 0.35), 0 0 100px 30px rgba(165, 180, 252, 0.2)",
        }}
      >
        <span className="absolute left-[28%] top-[35%] h-2 w-2 rounded-full bg-slate-400/40" />
        <span className="absolute left-[55%] top-[50%] h-1.5 w-1.5 rounded-full bg-slate-400/30" />
      </div>

      {/* Stars */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 600 700"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="star-glow">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {STAR_FIELD.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
        ))}
        <circle cx="80" cy="120" r="1.8" fill="url(#star-glow)" opacity="0.9" />
        <circle cx="180" cy="200" r="1.4" fill="url(#star-glow)" opacity="0.7" />
        <circle cx="430" cy="180" r="1.6" fill="url(#star-glow)" opacity="0.85" />
        <circle cx="500" cy="280" r="1.3" fill="url(#star-glow)" opacity="0.75" />
        <circle cx="120" cy="280" r="1.2" fill="url(#star-glow)" opacity="0.7" />
      </svg>

      {/* Mountain layers */}
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/4 w-full"
        viewBox="0 0 600 700"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mtn-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f2a4a" />
            <stop offset="100%" stopColor="#0c1228" />
          </linearGradient>
          <linearGradient id="mtn-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#141c38" />
            <stop offset="100%" stopColor="#070b1c" />
          </linearGradient>
          <linearGradient id="mtn-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1128" />
            <stop offset="100%" stopColor="#03050f" />
          </linearGradient>
          <linearGradient id="snow-cap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(226,232,240,0.85)" />
            <stop offset="100%" stopColor="rgba(148,163,184,0)" />
          </linearGradient>
        </defs>

        {/* Far range */}
        <path
          d="M 30 350 L 100 280 L 180 330 L 250 240 L 330 310 L 410 260 L 480 320 L 560 280 L 600 310 L 600 700 L 0 700 Z"
          fill="url(#mtn-far)"
        />
        <path
          d="M 250 240 L 268 256 L 290 256 L 302 272 L 330 310 L 320 285 L 290 268 Z"
          fill="url(#snow-cap)"
          opacity="0.9"
        />
        <path
          d="M 410 260 L 425 275 L 455 275 L 470 295 L 480 320 L 465 300 L 450 290 Z"
          fill="url(#snow-cap)"
          opacity="0.85"
        />

        {/* Mid range */}
        <path
          d="M 0 450 L 70 380 L 140 430 L 220 360 L 310 420 L 380 380 L 460 440 L 540 400 L 600 430 L 600 700 L 0 700 Z"
          fill="url(#mtn-mid)"
        />
        <path
          d="M 220 360 L 235 375 L 260 375 L 275 390 L 310 420 L 295 395 L 265 385 Z"
          fill="url(#snow-cap)"
          opacity="0.55"
        />

        {/* Near range — darkest, tallest */}
        <path
          d="M 0 700 L 0 520 L 70 480 L 150 540 L 240 460 L 320 530 L 410 470 L 500 540 L 580 480 L 600 500 L 600 700 Z"
          fill="url(#mtn-near)"
        />
      </svg>

      {/* Atmospheric haze */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.08) 50%, rgba(56, 189, 248, 0.1) 100%)",
        }}
      />

      {/* Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.65) 100%)",
        }}
      />

      {/* Right edge fade so form column gets visual separation */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0c0f1a] to-transparent"
      />

      {/* Top-left wordmark — HMS in metallic style + suite name */}
      <div className="absolute left-7 top-7 z-10 flex items-center gap-2.5">
        <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-slate-200 via-slate-400 to-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_14px_rgba(0,0,0,0.4)]">
          <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-[13px] font-extrabold tracking-tight text-transparent">
            H
          </span>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20"
          />
        </div>
        <span className="text-base font-semibold tracking-tight text-white">
          HMS
        </span>
      </div>

      {/* Top-right nav — admin scope (no Sign Up link) */}
      <nav className="absolute right-7 top-7 z-10 flex items-center gap-5 text-[11px] uppercase tracking-[0.2em] text-white/70">
        <a href="#" className="text-white transition-colors hover:text-white">
          Admin
        </a>
        <span className="text-white/40">Staff Login</span>
      </nav>

      {/* Bottom-left identity card (testimonial-style chip) */}
      <div className="absolute bottom-7 left-7 right-7 z-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md shadow-lg shadow-black/30">
          <Quote className="mb-1.5 h-3.5 w-3.5 text-white/60" />
          <p className="text-[13px] leading-snug text-white/90">
            Run your hotel, reservations, and staff — all from one secure place.
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <div
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 text-[11px] font-bold text-white shadow-md"
            >
              A
            </div>
            <div className="leading-tight">
              <p className="text-[12px] font-medium text-white">Admin Console</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Hospitality Operations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STAR_FIELD = (() => {
  const stars: { x: number; y: number; r: number; o: number }[] = [];
  let seed = 421;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 130; i++) {
    stars.push({
      x: rand() * 600,
      y: rand() * 420,
      r: rand() * 1 + 0.3,
      o: rand() * 0.7 + 0.2,
    });
  }
  return stars;
})();
