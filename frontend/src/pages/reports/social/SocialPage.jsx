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

  const shellClassName =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-black shadow-[0_0_0_3px_rgba(255,255,255,0.02)]";

  if (text.includes("facebook")) {
    return (
      <span
        className={`${shellClassName} border-blue-500/70 text-blue-500`}
        aria-label="Facebook"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M13.8 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.7-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.7v3.2h2.8V22h3.3Z" />
        </svg>
      </span>
    );
  }

  if (text.includes("instagram")) {
    return (
      <span
        className={`${shellClassName} border-pink-500/70 text-pink-500`}
        aria-label="Instagram"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.25" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }

  if (text.includes("reddit")) {
    return (
      <span
        className={`${shellClassName} border-orange-500/70 text-orange-500`}
        aria-label="Reddit"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="13" r="6.5" />
          <circle cx="9.2" cy="12.2" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.8" cy="12.2" r="1" fill="currentColor" stroke="none" />
          <path d="M9.2 15.5c1.5 1 4.1 1 5.6 0" />
          <path d="M13.3 6.7 14.2 3l3.5.8" />
          <circle cx="18.4" cy="5" r="1.35" />
          <path d="M5.8 10.2 4.3 9.4" />
          <path d="m18.2 10.2 1.5-.8" />
        </svg>
      </span>
    );
  }
if (
  text.includes("youtube")
) {
  return (
    <span
      className={`${shellClassName} border-red-600/70 text-red-600`}
      aria-label="YouTube"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M23 12s0-3.5-.45-5.18a2.94 2.94 0 0 0-2.07-2.07C18.8 4.3 12 4.3 12 4.3s-6.8 0-8.48.45A2.94 2.94 0 0 0 1.45 6.82C1 8.5 1 12 1 12s0 3.5.45 5.18a2.94 2.94 0 0 0 2.07 2.07c1.68.45 8.48.45 8.48.45s6.8 0 8.48-.45a2.94 2.94 0 0 0 2.07-2.07C23 15.5 23 12 23 12ZM10 15.5v-7l6 3.5-6 3.5Z" />
      </svg>
    </span>
  );
}
  if (text.includes("messenger")) {
    return (
      <span
        className={`${shellClassName} border-sky-500/70 text-sky-500`}
        aria-label="Messenger"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 3C6.9 3 3 6.7 3 11.5c0 2.6 1.2 4.9 3.2 6.5V22l3.5-1.9c.7.2 1.5.3 2.3.3 5.1 0 9-3.7 9-8.5S17.1 3 12 3Zm1 11.1-2.3-2.4-4.4 2.4 4.8-5.1 2.3 2.4L17.7 9 13 14.1Z" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`${shellClassName} border-zinc-700 text-zinc-500`}
      aria-label="Unknown platform"
    >
      <HelpCircle size={22} strokeWidth={1.8} />
    </span>
  );
}

function PlatformValue({ value }) {
  return (
    <div className="flex min-w-[230px] items-center gap-4 py-1">
      <PlatformIcon platform={value} />

      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">
          {value || "Unknown"}
        </p>

       
      </div>
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


function ResponseFilterButton({
  active,
  label,
  count,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-black transition",
        active
          ? "border-[#00dcc5] bg-[#00dcc5] text-black"
          : "border-zinc-800 bg-black text-zinc-400 hover:border-[#00dcc5] hover:text-white",
      ].join(" ")}
    >
      <span>{label}</span>

      <span
        className={[
          "rounded-full px-2 py-0.5 text-[10px]",
          active
            ? "bg-black/15 text-black"
            : "bg-zinc-900 text-zinc-500",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function SocialTable({ rows }) {
  const [
    responseFilter,
    setResponseFilter,
  ] = useState("All");

  const normalizedRows = useMemo(
    () =>
      (Array.isArray(rows) ? rows : []).map(
        (row) => ({
          ...row,
          normalizedCustomerResponse:
            String(
              row.customerResponse || "Unknown",
            )
              .trim()
              .toLowerCase(),
        }),
      ),
    [rows],
  );

  const counts = useMemo(
    () =>
      normalizedRows.reduce(
        (result, row) => {
          result.All += 1;

          const value =
            row.normalizedCustomerResponse;

          if (value === "positive") {
            result.Positive += 1;
          } else if (value === "negative") {
            result.Negative += 1;
          } else if (value === "neutral") {
            result.Neutral += 1;
          } else {
            result.Unknown += 1;
          }

          return result;
        },
        {
          All: 0,
          Positive: 0,
          Neutral: 0,
          Negative: 0,
          Unknown: 0,
        },
      ),
    [normalizedRows],
  );

  const visibleRows = useMemo(() => {
    if (responseFilter === "All") {
      return normalizedRows;
    }

    return normalizedRows.filter(
      (row) =>
        row.normalizedCustomerResponse ===
        responseFilter.toLowerCase(),
    );
  }, [
    normalizedRows,
    responseFilter,
  ]);

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
              Report Table
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Social Report Data
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Showing {visibleRows.length} from{" "}
              {normalizedRows.length} social records.
              Latest Post/Query Date appears first.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ResponseFilterButton
              label="All"
              count={counts.All}
              active={responseFilter === "All"}
              onClick={() =>
                setResponseFilter("All")
              }
            />

            <ResponseFilterButton
              label="Positive"
              count={counts.Positive}
              active={
                responseFilter === "Positive"
              }
              onClick={() =>
                setResponseFilter("Positive")
              }
            />

            <ResponseFilterButton
              label="Neutral"
              count={counts.Neutral}
              active={
                responseFilter === "Neutral"
              }
              onClick={() =>
                setResponseFilter("Neutral")
              }
            />

            <ResponseFilterButton
              label="Negative"
              count={counts.Negative}
              active={
                responseFilter === "Negative"
              }
              onClick={() =>
                setResponseFilter("Negative")
              }
            />

            {counts.Unknown > 0 ? (
              <ResponseFilterButton
                label="Unknown"
                count={counts.Unknown}
                active={
                  responseFilter === "Unknown"
                }
                onClick={() =>
                  setResponseFilter("Unknown")
                }
              />
            ) : null}
          </div>
        </div>
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
            {!visibleRows.length ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center"
                >
                  No matching social records found.
                </td>
              </tr>
            ) : null}

            {visibleRows.map((row, index) => (
              <tr
                key={
                  row.id ||
                  `${row.postQueryDate}-${index}`
                }
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={
                      [
                        "postQuery",
                        "response",
                      ].includes(column.key)
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
                      let fill =
                        chartColors[
                          index %
                            chartColors.length
                        ];

                      if (
                        item.name ===
                        "Positive"
                      ) {
                        fill = "#22c55e";
                      } else if (
                        item.name ===
                        "Negative"
                      ) {
                        fill = "#ef4444";
                      } else if (
                        item.name ===
                        "Neutral"
                      ) {
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

          <ChartCard title="Social Platform Breakdown">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.byPlatform || []}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#222"
                />

                <XAxis
                  dataKey="name"
                  stroke="#777"
                />

                <YAxis
                  stroke="#777"
                  allowDecimals={false}
                />

                <Tooltip
                  content={<DarkTooltip />}
                />

                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                >
                  {(analytics.byPlatform || []).map(
                    (item, index) => {
                      const name = String(
                        item?.name || "",
                      ).toLowerCase();

                      let fill =
                        chartColors[
                          index %
                            chartColors.length
                        ];

                      if (
                        name.includes(
                          "facebook",
                        )
                      ) {
                        fill = "#1877f2";
                      } else if (
                        name.includes(
                          "instagram",
                        )
                      ) {
                        fill = "#e1306c";
                      } else if (
                        name.includes(
                          "reddit",
                        )
                      ) {
                        fill = "#ff4500";
                      } else if (
                        name.includes(
                          "messenger",
                        )
                      ) {
                        fill = "#38bdf8";
                      }

                      return (
                        <Cell
                          key={`platform-breakdown-${item.name}-${index}`}
                          fill={fill}
                        />
                      );
                    },
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
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