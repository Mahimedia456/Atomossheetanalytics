const chartLimits = [
  { label: "Top 10", value: "10" },
  { label: "Top 25", value: "25" },
  { label: "Top 50", value: "50" },
  { label: "All", value: "all" },
];

export default function ChartCard({
  title,
  subtitle = "",
  children,
  limit = "10",
  onLimitChange,
  showLimit = true,
  height = 340,
  className = "",
}) {
  return (
    <section
      className={[
        "dashboard-card min-w-0 overflow-hidden p-5",
        className,
      ].join(" ")}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">
            {title}
          </h3>

          {subtitle ? (
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        {showLimit ? (
          <select
            value={limit}
            onChange={(event) =>
              onLimitChange?.(event.target.value)
            }
            className="h-10 shrink-0 rounded-full border border-zinc-800 bg-black px-4 text-xs font-black text-zinc-300 outline-none transition hover:border-[#00dcc5] focus:border-[#00dcc5]"
          >
            {chartLimits.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div
        className="relative min-w-0 overflow-hidden"
        style={{
          height: `${height}px`,
        }}
      >
        {children}
      </div>
    </section>
  );
}
