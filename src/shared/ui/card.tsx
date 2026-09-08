import { twMerge } from "tailwind-merge";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={twMerge("surface rounded-2xl p-5", className)}>{children}</section>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="muted mt-1 text-sm">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed p-8 text-center">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="muted mt-1 max-w-md text-sm">{description}</p>
      </div>
    </div>
  );
}
