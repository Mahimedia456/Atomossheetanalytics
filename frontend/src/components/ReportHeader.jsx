import {
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export default function ReportHeader({
  title,
  subtitle,
  syncedAt,
  exportingPdf = false,
  onExcel,
  onPdf,
}) {
  return (
    <section className="dashboard-card min-w-0 overflow-hidden bg-black">
      <div className="grid min-w-0 gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:p-10">
        <div className="flex min-w-0 flex-col justify-center">
          <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-[#00dcc5]/40 bg-[#00dcc5]/10 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#00dcc5]">
            <ShieldCheck className="h-4 w-4" />
            Atomos Analytics Workspace
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
            Zendesk Report
          </p>

          <h1 className="mt-3 break-words text-4xl font-black tracking-tight text-white md:text-5xl">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-500">
              {subtitle}
            </p>
          ) : null}

          <p className="mt-4 text-xs font-semibold text-zinc-600">
            {syncedAt
              ? `Last synced: ${new Date(syncedAt).toLocaleString()}`
              : "Dashboard data is synchronized automatically."}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {onExcel ? (
              <button
                type="button"
                onClick={onExcel}
                disabled={exportingPdf}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-6 py-2.5 text-sm font-black text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet size={17} />
                Export Excel
              </button>
            ) : null}

            {onPdf ? (
              <button
                type="button"
                onClick={onPdf}
                disabled={exportingPdf}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/15 px-6 py-2.5 text-sm font-black text-red-300 transition hover:border-red-400 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exportingPdf ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Download size={17} />
                )}
                {exportingPdf ? "Generating PDF..." : "Export PDF"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-[28px] border border-zinc-800 bg-black p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(0,220,197,0.10),transparent_58%)]" />

          <div className="relative z-10 flex min-h-[300px] min-w-0 flex-col">
            <p className="text-center text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
              Presented By
            </p>

            <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-7">
              <img
                src="/mahi.logo.webp"
                alt="Mahimedia Solutions"
                loading="eager"
                decoding="sync"
                className="block h-auto max-h-[150px] w-auto max-w-full object-contain"
              />
            </div>

            <div className="border-t border-zinc-900 pt-5 text-center">
              <p className="text-base font-black text-white">Mahimedia Solutions</p>
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
