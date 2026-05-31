import { useEffect, useState } from "react";
import { encouragements } from "@/lib/mock-data";
import { Sparkles } from "lucide-react";

export function EncouragementCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % encouragements.length), 4500);
    return () => clearInterval(t);
  }, []);
  const e = encouragements[i];
  return (
    <div className="rounded-2xl bg-gradient-primary p-4 text-primary-foreground shadow-glow relative min-w-0 max-w-full overflow-hidden">
      <div className="absolute -bottom-6 -right-6 size-24 rounded-full bg-white/10 blur-xl" />
      <div className="relative flex min-w-0 items-start gap-3">
        <div className="size-10 rounded-xl bg-white/15 grid place-items-center text-2xl shrink-0">
          {e.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest opacity-80">
            <Sparkles className="size-3 shrink-0" /> Daily encouragement
          </div>
          <div
            key={e.id}
            className="mt-1 animate-in-up text-sm font-medium leading-snug break-words line-clamp-4 sm:line-clamp-none"
          >
            {e.text}
          </div>
        </div>
      </div>
      <div className="flex gap-1 mt-3">
        {encouragements.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 flex-1 rounded-full transition-colors ${idx === i ? "bg-white" : "bg-white/30"}`}
          />
        ))}
      </div>
    </div>
  );
}
