export default function Loading() {
  return <div className="animate-pulse space-y-6"><div className="h-10 w-72 rounded-xl bg-[var(--border)]" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 rounded-2xl bg-[var(--border)]" />)}</div><div className="h-96 rounded-2xl bg-[var(--border)]" /></div>;
}
