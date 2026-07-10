export default function MetricCard({ label, value, hint }) {
  return (
    <div className="dashboard-card p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>

      <h3 className="mt-3 text-3xl font-black text-white">{value ?? 0}</h3>

      {hint ? <p className="mt-2 text-xs text-zinc-600">{hint}</p> : null}
    </div>
  );
}