import { twMerge } from "tailwind-merge";

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={twMerge("h-11 rounded-xl border bg-transparent px-3 text-sm placeholder:text-[var(--muted)]", props.className)} {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={twMerge("h-11 rounded-xl border bg-[var(--card)] px-3 text-sm", props.className)} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={twMerge("min-h-24 rounded-xl border bg-transparent px-3 py-2 text-sm", props.className)} {...props} />;
}
