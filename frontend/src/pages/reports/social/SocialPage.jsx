import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";

import ChartCard from "../../../components/ChartCard";
import MetricCard from "../../../components/MetricCard";
import ReportHeader from "../../../components/ReportHeader";
import ReportPdfLoader from "../../../components/ReportPdfLoader";
import { exportDashboardPdf, waitForPdfUiPaint } from "../../../utils/dashboardPdfExport";
import SocialFilters, { initialSocialFilters } from "./SocialFilters";
import { fetchSocialReport, syncSocial } from "../../../services/socialApi";

const columns = [
  { key: "customerName", label: "Customer Name" },
  { key: "region", label: "Region" },
  { key: "country", label: "Country" },
  { key: "postQueryDate", label: "Post/Query Date" },
  { key: "submitted", label: "Submitted" },
  { key: "date", label: "Response Date" },
  { key: "product", label: "Product" },
  { key: "postQuery", label: "Post/Query" },
  { key: "response", label: "Response" },
  { key: "category", label: "Category" },
  { key: "status", label: "Resolve/Unresolve" },
];

const chartColors = [
  "#00dcc5",
  "#22c55e",
  "#38bdf8",
  "#eab308",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#f43f5e",
  "#84cc16",
];

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl"
    >
      <p className="font-black text-white">{label || payload[0]?.name}</p>
      <p className="mt-1 font-bold text-[#00dcc5]">
        Queries: {payload[0]?.value ?? 0}
      </p>
    </div>
  );
}

function SocialTable({ rows }) {
  return (
    <section className="dashboard-card overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
          Report Table
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">Social Report Data</h2>

        <p className="mt-2 text-sm text-zinc-500">
          Showing {rows.length} social records.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="soft-table min-w-[1800px]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!rows.length ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  No social records found.
                </td>
              </tr>
            ) : null}

            {rows.map((row, index) => (
              <tr key={`${row.customerName}-${index}`}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={
                      ["postQuery", "response"].includes(column.key)
                        ? "min-w-[380px] whitespace-normal leading-6"
                        : ""
                    }
                  >
                    {row[column.key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SocialPage() {
  const [filters, setFilters] = useState(initialSocialFilters);
  const [report, setReport] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfMessage, setPdfMessage] = useState("");

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const analytics = report?.analytics || {};
  const rows = report?.rows || [];
  const options = report?.filters || {};

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchSocialReport({
        ...filters,

        // Send both naming conventions so the date range works regardless
        // of whether the backend expects fromDate/toDate or dateFrom/dateTo.
        fromDate:
          filters.fromDate || "",
        toDate:
          filters.toDate || "",
        dateFrom:
          filters.fromDate || "",
        dateTo:
          filters.toDate || "",

        limit: 5000,
      });

      setReport(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load Social report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError("");

    try {
      await syncSocial();
      await loadReport();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Social sync failed."
      );
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [filterKey]);

  function exportExcel() {
    if (!rows.length) {
      window.alert("No social rows to export.");
      return;
    }

    const exportRows = rows.map((row) => {
      const item = {};
      columns.forEach((column) => {
        item[column.label] = row[column.key] ?? "";
      });
      return item;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Social Report");
    XLSX.writeFile(wb, "social-report.xlsx");
  }

  async function exportPdf() {
  if (pdfExporting) {
    return;
  }

  setError("");
  setPdfExporting(true);
  setPdfProgress(1);
  setPdfMessage(
    "Preparing Social Analytics metrics, charts and report table...",
  );

  await waitForPdfUiPaint();

  try {
    await exportDashboardPdf({
      rootId:
        "social-analytics-pdf-content",

      title:
        "Social Analytics",

      filename:
        "social-analytics-dashboard",

      onProgress: ({
        progress,
        message,
      }) => {
        setPdfProgress(
          Math.min(
            99,
            Math.max(
              1,
              Number(progress) || 1,
            ),
          ),
        );

        setPdfMessage(
          message,
        );
      },
    });

    setPdfProgress(100);
    setPdfMessage(
      "Social Analytics PDF is ready. Download started.",
    );

    await new Promise(
      (resolve) => {
        window.setTimeout(
          resolve,
          1400,
        );
      },
    );
  } catch (pdfError) {
    setError(
      pdfError?.message ||
        "Unable to export Social Analytics PDF.",
    );
  } finally {
    setPdfExporting(false);
    setPdfProgress(0);
    setPdfMessage("");
  }
}

  return (
    <>
      <ReportPdfLoader
        open={pdfExporting}
        reportName="Social Analytics"
        progress={pdfProgress}
        message={pdfMessage}
      />

      <div
      id="social-analytics-pdf-content"
      className="space-y-6"
    >
      <div data-pdf-skip="true">
        <ReportHeader
          title="Social Analytics"
          // subtitle="Social post and query reporting with response tracking, product, category, region, country and resolved status analytics."
          syncedAt={report?.syncedAt}
          onExcel={exportExcel}
          onPdf={exportPdf}
          exportingPdf={pdfExporting}
        />
      </div>

      {error ? (
        <div data-html2canvas-ignore="true" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {error}
        </div>
      ) : null}

      <div data-html2canvas-ignore="true">

        

              <SocialFilters
          filters={filters}
          setFilters={setFilters}
          options={options}
        />

      </div>

      <section data-pdf-section="true" data-pdf-keep-together="true" data-pdf-grid="4" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Queries" value={analytics.totalQueries} hint="Social records" />
        <MetricCard label="Solved" value={analytics.solved} hint="Resolved responses" />
        <MetricCard label="Unsolved" value={analytics.unsolved} hint="Open responses" />
        <MetricCard label="Countries" value={analytics.countries} hint="Known countries" />
      </section>

      <section data-pdf-section="true" data-pdf-keep-together="true">
        {/* <ChartCard title="Date-wise Social Queries" showLimit={false}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.byDate || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip content={<DarkTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00dcc5"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard> */}
      </section>

      <section data-pdf-section="true" data-pdf-keep-together="true" data-pdf-grid="2" className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Product-wise Social Queries">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byProduct || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value">
                {(analytics.byProduct || []).map((_, index) => (
                  <Cell key={index} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Category-wise Social Queries">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byCategory || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value">
                {(analytics.byCategory || []).map((_, index) => (
                  <Cell key={index} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Region-wise Social Queries">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analytics.byRegion || []}
                dataKey="value"
                nameKey="name"
                outerRadius={105}
                label
              >
                {(analytics.byRegion || []).map((_, index) => (
                  <Cell key={index} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Solved vs Unsolved">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analytics.byStatus || []}
                dataKey="value"
                nameKey="name"
                outerRadius={105}
                label
              >
                {(analytics.byStatus || []).map((_, index) => (
                  <Cell key={index} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <div data-pdf-section="true" data-pdf-table="true">
        <SocialTable rows={rows} />
      </div>

      {loading ? (
        <div data-html2canvas-ignore="true" className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]">
          Loading Social report...
        </div>
      ) : null}
    </div>
</>
  );
}