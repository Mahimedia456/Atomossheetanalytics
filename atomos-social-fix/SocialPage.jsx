import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CircleCheck,
  CircleMinus,
  CircleX,
  HelpCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

import ChartCard from "../../../components/ChartCard";
import MetricCard from "../../../components/MetricCard";
import ReportHeader from "../../../components/ReportHeader";
import ReportPdfLoader from "../../../components/ReportPdfLoader";
import {
  exportDashboardPdf,
  waitForPdfUiPaint,
} from "../../../utils/dashboardPdfExport";
import SocialFilters, {
  initialSocialFilters,
} from "./SocialFilters";
import {
  fetchSocialReport,
  syncSocial,
} from "../../../services/socialApi";

const columns = [
  {
    key: "socialPlatform",
    label: "Social Platform",
  },
  {
    key: "region",
    label: "Region",
  },
  {
    key: "country",
    label: "Country",
  },
  {
    key: "postQueryDate",
    label: "Post/Query Date",
  },
  {
    key: "product",
    label: "Product",
  },
  {
    key: "postQuery",
    label: "Post/Query",
  },
  {
    key: "response",
    label: "Response",
  },
  {
    key: "category",
    label: "Category",
  },
  {
    key: "customerResponse",
    label: "Customer Response",
  },
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
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl">
      <p className="font-black text-white">
        {label || payload[0]?.name}
      </p>

      <p className="mt-1 font-bold text-[#00dcc5]">
        Queries: {payload[0]?.value ?? 0}
      </p>
    </div>
  );
}

function PlatformIcon({ platform = "" }) {
  const text = String(platform).toLowerCase();

  if (text.includes("facebook")) {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
        f
      </span>
    );
  }

  if (text.includes("instagram")) {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-500 text-white">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }

  if (text.includes("reddit")) {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="13" r="7" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <path d="M9 16c1.6 1 4.4 1 6 0" />
          <path d="M14 6l1-4 4 1" />
        </svg>
      </span>
    );
  }

  if (text.includes("messenger")) {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="currentColor"
        >
          <path d="M12 3C6.9 3 3 6.7 3 11.5c0 2.7 1.2 5 3.3 6.6V22l3.4-1.9c.8.2 1.5.3 2.3.3 5.1 0 9-3.7 9-8.5S17.1 3 12 3Zm1 11-2.3-2.4L6.3 14l4.8-5.1 2.3 2.4L17.7 9 13 14Z" />
        </svg>
      </span>
    );
  }

  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400">
      <HelpCircle size={15} />
    </span>
  );
}

function PlatformValue({ value }) {
  return (
    <div className="flex min-w-[180px] items-center gap-2.5">
      <PlatformIcon platform={value} />
      <span className="font-bold text-zinc-200">
        {value || "Unknown"}
      </span>
    </div>
  );
}

function CustomerResponseValue({ value }) {
  const normalized = String(value || "Unknown").toLowerCase();

  if (normalized === "positive") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300">
        <CircleCheck size={15} />
        Positive
      </span>
    );
  }

  if (normalized === "negative") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-300">
        <CircleX size={15} />
        Negative
      </span>
    );
  }

  if (normalized === "neutral") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-300">
        <CircleMinus size={15} />
        Neutral
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-black text-zinc-400">
      <HelpCircle size={15} />
      {value || "Unknown"}
    </span>
  );
}

function renderCell(row, column) {
  if (column.key === "socialPlatform") {
    return <PlatformValue value={row[column.key]} />;
  }

  if (column.key === "customerResponse") {
    return <CustomerResponseValue value={row[column.key]} />;
  }

  return row[column.key] || "-";
}

function SocialTable({ rows }) {
  return (
    <section className="dashboard-card overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
          Report Table
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          Social Report Data
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          Showing {rows.length} social records. Latest Post/Query Date appears first.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="soft-table min-w-[1500px]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!rows.length ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center"
                >
                  No social records found.
                </td>
              </tr>
            ) : null}

            {rows.map((row, index) => (
              <tr key={row.id || `${row.postQueryDate}-${index}`}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={
                      ["postQuery", "response"].includes(column.key)
                        ? "min-w-[380px] whitespace-normal leading-6"
                        : ""
                    }
                  >
                    {renderCell(row, column)}
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

  const filterKey = useMemo(
    () => JSON.stringify(filters),
    [filters],
  );

  const analytics = report?.analytics || {};

  const rows = useMemo(
    () =>
      [...(report?.rows || [])].sort((a, b) => {
        const dateDifference = String(
          b.postQueryDate || "",
        ).localeCompare(String(a.postQueryDate || ""));

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return Number(b.sheetRowNumber || 0) - Number(a.sheetRowNumber || 0);
      }),
    [report?.rows],
  );

  const options = report?.filters || {};

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchSocialReport({
        ...filters,
        fromDate: filters.fromDate || "",
        toDate: filters.toDate || "",
        dateFrom: filters.fromDate || "",
        dateTo: filters.toDate || "",
        limit: 5000,
      });

      setReport(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load Social report.",
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
          "Social sync failed.",
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

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Social Report",
    );

    XLSX.writeFile(workbook, "social-report.xlsx");
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
        rootId: "social-analytics-pdf-content",
        title: "Social Analytics",
        filename: "social-analytics-dashboard",
        onProgress: ({ progress, message }) => {
          setPdfProgress(
            Math.min(
              99,
              Math.max(1, Number(progress) || 1),
            ),
          );
          setPdfMessage(message);
        },
      });

      setPdfProgress(100);
      setPdfMessage(
        "Social Analytics PDF is ready. Download started.",
      );

      await new Promise((resolve) => {
        window.setTimeout(resolve, 1400);
      });
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
            syncedAt={report?.syncedAt}
            onRefresh={handleSync}
            loading={loading}
            syncing={syncing}
            onExcel={exportExcel}
            onPdf={exportPdf}
            exportingPdf={pdfExporting}
          />
        </div>

        {error ? (
          <div
            data-html2canvas-ignore="true"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200"
          >
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

        <section
          data-pdf-section="true"
          data-pdf-keep-together="true"
          data-pdf-grid="4"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            label="Total Queries"
            value={analytics.totalQueries || 0}
            hint="Social records"
          />

          <MetricCard
            label="Product-wise Count"
            value={analytics.productCount || 0}
            hint="Unique products"
          />

          <MetricCard
            label="Category-wise Count"
            value={analytics.categoryCount || 0}
            hint="Unique categories"
          />

          <MetricCard
            label="Countries"
            value={analytics.countries || 0}
            hint="Known countries"
          />
        </section>

        <section
          data-pdf-section="true"
          data-pdf-keep-together="true"
          data-pdf-grid="2"
          className="grid gap-6 xl:grid-cols-2"
        >
          <ChartCard title="Product-wise Social Queries">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byProduct || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#777" />
                <YAxis stroke="#777" allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value">
                  {(analytics.byProduct || []).map((_, index) => (
                    <Cell
                      key={`product-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
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
                <YAxis stroke="#777" allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value">
                  {(analytics.byCategory || []).map((_, index) => (
                    <Cell
                      key={`category-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
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
                    <Cell
                      key={`region-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Social Platform-wise Queries">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.byPlatform || []}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 25,
                  left: 30,
                  bottom: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis type="number" stroke="#777" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#777"
                  width={125}
                />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {(analytics.byPlatform || []).map((_, index) => (
                    <Cell
                      key={`platform-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="xl:col-span-2">
            <ChartCard title="Customer Response">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byCustomerResponse || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" stroke="#777" />
                  <YAxis stroke="#777" allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {(analytics.byCustomerResponse || []).map(
                      (item, index) => {
                        let fill = chartColors[index % chartColors.length];

                        if (item.name === "Positive") {
                          fill = "#22c55e";
                        } else if (item.name === "Negative") {
                          fill = "#ef4444";
                        } else if (item.name === "Neutral") {
                          fill = "#eab308";
                        }

                        return (
                          <Cell
                            key={`customer-response-${item.name}-${index}`}
                            fill={fill}
                          />
                        );
                      },
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </section>

        <div data-pdf-section="true" data-pdf-table="true">
          <SocialTable rows={rows} />
        </div>

        {loading ? (
          <div
            data-html2canvas-ignore="true"
            className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]"
          >
            Loading Social report...
          </div>
        ) : null}
      </div>
    </>
  );
}
