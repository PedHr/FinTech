import { twMerge } from "tailwind-merge";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  const variants = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]",
    secondary: "border bg-[var(--card)] hover:bg-[var(--accent)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
    ghost: "hover:bg-[var(--accent)]",
  };
  return (
    <button
      className={twMerge(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
