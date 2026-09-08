import { Landmark } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-bold tracking-tight">
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-white shadow-lg shadow-emerald-600/20">
        <Landmark className="size-5" />
      </span>
      <span className="text-lg">FinControl</span>
    </div>
  );
}
