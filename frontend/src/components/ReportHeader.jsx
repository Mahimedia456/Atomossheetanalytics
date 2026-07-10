import {
  Download,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Unlink,
} from "lucide-react";

export default function ReportHeader({
  title,
  subtitle,
  syncedAt,
  loading,
  onSync,
  onUnsync,
  onExcel,
  onPdf,
}) {
  return (
    <section className="dashboard-card overflow-hidden bg-black">
      <div className="grid gap-8 p-8 lg:grid-cols-[1fr_420px] lg:p-10">
        <div className="flex flex-col justify-center">
          <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-[#00dcc5]/40 bg-[#00dcc5]/10 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#00dcc5]">
            <ShieldCheck className="h-4 w-4" />
            Atomos Analytics Workspace
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
            Zendesk Report
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-500">
            {subtitle}
          </p>

          {syncedAt ? (
            <p className="mt-4 text-xs font-semibold text-zinc-600">
              Last synced: {new Date(syncedAt).toLocaleString()}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSync}
              disabled={loading}
              className="btn btn-primary inline-flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Syncing..." : "Sync Ticket Data"}
            </button>

            <button
              type="button"
              onClick={onUnsync}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2 text-sm font-black text-black transition hover:bg-zinc-200"
            >
              <Unlink size={15} />
              Unsync
            </button>

            <button
              type="button"
              onClick={onExcel}
              className="btn border border-zinc-800 bg-black text-zinc-200 hover:border-[#00dcc5]"
            >
              <FileSpreadsheet size={16} className="mr-2 inline" />
              Excel
            </button>

            <button
              type="button"
              onClick={onPdf}
              className="btn border border-zinc-800 bg-black text-zinc-200 hover:border-[#00dcc5]"
            >
              <Download size={16} className="mr-2 inline" />
              PDF
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-black p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,220,197,0.11),transparent_55%)]" />

          <div className="relative z-10 flex min-h-[300px] flex-col">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
              Presented By
            </p>

            <div className="flex flex-1 items-center justify-center">
              <img
                src="/mahi.logo.webp"
                alt="Mahimedia Solutions"
                className="max-h-[145px] w-full max-w-[340px] object-contain"
              />
            </div>

            <div className="border-t border-zinc-900 pt-5 text-center">
              <p className="text-base font-black text-white">
                Mahimedia Solutions
              </p>

              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#00dcc5]">
                Analytics & Reporting Solutions
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}