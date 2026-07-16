import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ theme, onToggle, compact = false }) {
  const light = theme === "light";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={light ? "Enable dark mode" : "Enable light mode"}
      className={[
        "inline-flex shrink-0 items-center justify-center gap-2 border border-[var(--at-border)] bg-[var(--at-panel)] font-black text-[var(--at-muted)] transition hover:border-[#00dcc5] hover:text-[#00dcc5]",
        compact ? "h-10 w-10 rounded-xl" : "rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.06em]",
      ].join(" ")}
    >
      {light ? <Moon size={16} /> : <Sun size={16} />}
      {!compact ? <span>{light ? "Dark" : "Light"}</span> : null}
    </button>
  );
}
