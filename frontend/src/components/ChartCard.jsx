const chartLimits = [
  { label: "All", value: "all" },
  { label: "Top 10", value: "10" },
  { label: "Top 25", value: "25" },
  { label: "Top 50", value: "50" },
];

export default function ChartCard({
  title,
  children,
  limit = "10",
  onLimitChange,
  showLimit = true,
}) {
  return (
    <div className="dashboard-card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">
          {title}
        </h3>

        {showLimit ? (
          <select
            value={limit}
            onChange={(event) => onLimitChange?.(event.target.value)}
            className="h-9 rounded-full border border-zinc-800 bg-black px-3 text-xs font-black text-zinc-300 outline-none transition hover:border-[#00dcc5] focus:border-[#00dcc5]"
          >
            {chartLimits.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="h-[320px]">{children}</div>
    </div>
  );
}