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
import DataTable from "../../../components/DataTable";
import MetricCard from "../../../components/MetricCard";
import ReportHeader from "../../../components/ReportHeader";
import ReportPdfLoader from "../../../components/ReportPdfLoader";
import { exportDashboardPdf, waitForPdfUiPaint } from "../../../utils/dashboardPdfExport";
import { fetchTicketReport, syncTickets } from "../../../services/ticketApi";
import TicketFilters from "./TicketFilters";

const initialFilters = {
  search: "",
  year: "",
  month: "",
  fromDate: "",
  toDate: "",
  region: "",
  tse: "",
  submissionStatus: "",
  product: "",
  category: "",
};

const columns = [
  { key: "ticketNumber", label: "Ticket Number" },
  { key: "date", label: "Date" },
  { key: "region", label: "Region" },
  { key: "internal", label: "Internal" },
  { key: "subject", label: "Subject" },
  { key: "product", label: "Product" },
  { key: "category", label: "Category" },
  { key: "comment", label: "Comment" },
  { key: "featureRequestSummary", label: "Feature Request Summary" },
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
  "#06b6d4",
  "#f59e0b",
];

function applyChartLimit(
  data = [],
  limit = "10",
) {
  const preparedRows = Array.isArray(data)
    ? [...data].sort(
        (a, b) =>
          Number(b?.value || 0) -
          Number(a?.value || 0),
      )
    : [];

  if (limit === "all") {
    return preparedRows;
  }

  const parsedLimit = Number(limit);

  if (
    !Number.isFinite(parsedLimit) ||
    parsedLimit <= 0
  ) {
    return preparedRows;
  }

  return preparedRows.slice(
    0,
    parsedLimit,
  );
}

function getHorizontalChartHeight(
  rowCount,
  {
    minimum = 360,
    rowHeight = 44,
    extra = 90,
    maximum = 2400,
  } = {},
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      Number(rowCount || 0) *
        rowHeight +
        extra,
    ),
  );
}

function getRegionColor(region) {
  const normalized = String(
    region || "",
  )
    .trim()
    .toUpperCase();

  if (
    normalized === "EMEA"
  ) {
    return "#00dcc5";
  }

  if (
    normalized === "US" ||
    normalized === "USA" ||
    normalized === "NA"
  ) {
    return "#22c55e";
  }

  if (
    normalized === "APAC"
  ) {
    return "#38bdf8";
  }

  if (
    normalized === "UAE"
  ) {
    return "#f59e0b";
  }

  return "#a855f7";
}

function RegionBadge({
  value,
}) {
  const normalized = String(
    value || "Unknown",
  )
    .trim()
    .toUpperCase();

  const className =
    normalized === "EMEA"
      ? "border-[#00dcc5]/30 bg-[#00dcc5]/10 text-[#00dcc5]"
      : normalized === "US" ||
          normalized === "USA" ||
          normalized === "NA"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : normalized === "APAC"
          ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
          : normalized === "UAE"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
            : "border-violet-500/30 bg-violet-500/10 text-violet-300";

  return (
    <span
      className={[
        "inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-black",
        className,
      ].join(" ")}
    >
      {value || "Unknown"}
    </span>
  );
}

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const name = label || payload[0]?.name || "";
  const value = payload[0]?.value ?? 0;

  return (
    <div
      className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl"
    >
      <p className="font-black text-white">{name}</p>
      <p className="mt-1 font-bold text-[#00dcc5]">Tickets: {value}</p>
    </div>
  );
}

function renderPieLabel(props) {
  const { cx, cy, midAngle, outerRadius, name, value } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={800}
    >
      {name}: {value}
    </text>
  );
}

export default function TicketAnalyticsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfMessage, setPdfMessage] = useState("");
  const [
    chartLimits,
    setChartLimits,
  ] = useState({
    product: "10",
    category: "10",
    region: "10",
  });

  const analytics = report?.analytics || {};
  const rows = report?.rows || [];
  const options = report?.filters || {};
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  function updateChartLimit(
    chartName,
    value,
  ) {
    setChartLimits((current) => ({
      ...current,
      [chartName]: value,
    }));
  }

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchTicketReport({ ...filters, limit: 5000 });
      setReport(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load ticket report.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError("");

    try {
      await syncTickets();
      await loadReport();
    } catch (err) {
      setError(err?.response?.data?.message || "Ticket sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [filterKey]);

  function exportExcel() {
    if (!rows.length) {
      window.alert("No ticket rows to export.");
      return;
    }

    const exportRows = rows.map((row) => {
      const cleanRow = {};
      columns.forEach((column) => {
        cleanRow[column.label] = row[column.key] ?? "";
      });
      return cleanRow;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Ticket Analytics");
    XLSX.writeFile(wb, "ticket-analytics.xlsx");
  }

  async function exportPdf() {
  if (pdfExporting) {
    return;
  }

  setError("");
  setPdfExporting(true);
  setPdfProgress(1);
  setPdfMessage(
    "Preparing Ticket Analytics metrics, charts and report table...",
  );

  await waitForPdfUiPaint();

  try {
    await exportDashboardPdf({
      rootId:
        "ticket-analytics-pdf-content",

      title:
        "Ticket Analytics",

      filename:
        "ticket-analytics-dashboard",

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
      "Ticket Analytics PDF is ready. Download started.",
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
        "Unable to export Ticket Analytics PDF.",
    );
  } finally {
    setPdfExporting(false);
    setPdfProgress(0);
    setPdfMessage("");
  }
}

  const productData = applyChartLimit(
    analytics.byProduct || [],
    chartLimits.product,
  );

  const categoryData = applyChartLimit(
    analytics.byCategory || [],
    chartLimits.category,
  );

  const regionData = applyChartLimit(
    analytics.byRegion || [],
    chartLimits.region,
  );

  const tableRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        date: (
          <span className="whitespace-nowrap font-bold text-zinc-300">
            {String(
              row.date || "-",
            ).replaceAll("-", "‑")}
          </span>
        ),
        region: (
          <RegionBadge
            value={row.region}
          />
        ),
      })),
    [rows],
  );

  return (
    <>
      <ReportPdfLoader
        open={pdfExporting}
        reportName="Ticket Analytics"
        progress={pdfProgress}
        message={pdfMessage}
      />

      <div
      id="ticket-analytics-pdf-content"
      className="space-y-6"
    >
   <div data-pdf-skip="true">
     <ReportHeader
       title="Ticket Analytics"
       syncedAt={report?.syncedAt}
       onUnsync={() => {
      setReport(null);
      setError("");
       }}
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

        

              <TicketFilters

                filters={filters}

                setFilters={setFilters}

                options={options}

              />

      </div>

      <section data-pdf-section="true" data-pdf-keep-together="true" data-pdf-grid="4" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Tickets"
          value={analytics.totalTickets}
          hint="Unique ticket count"
        />
        <MetricCard
          label="Products"
          value={(analytics.byProduct || []).filter((x) => x.name !== "Unknown").length}
          hint="Product groups"
        />
        <MetricCard
          label="Categories"
          value={(analytics.byCategory || []).filter((x) => x.name !== "Unknown").length}
          hint="Category groups"
        />
        <MetricCard
          label="TSE Agents"
          value={(analytics.byTse || []).filter((x) => x.name !== "Unknown").length}
          hint="Agent count"
        />
      </section>

      <section data-pdf-section="true" data-pdf-keep-together="true">
        <ChartCard title="Date-wise Tickets" showLimit={false}>
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
        </ChartCard>
      </section>

      <section data-pdf-section="true" data-pdf-keep-together="true" data-pdf-grid="2" className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Product-wise Tickets"
          subtitle="Tickets grouped by product"
          limit={chartLimits.product}
          onLimitChange={(value) =>
            updateChartLimit(
              "product",
              value,
            )
          }
          height={getHorizontalChartHeight(
            productData.length,
          )}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={productData}
              layout="vertical"
              margin={{
                top: 10,
                right: 35,
                left: 35,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
              />

              <XAxis
                type="number"
                stroke="#777"
                allowDecimals={false}
              />

              <YAxis
                type="category"
                dataKey="name"
                stroke="#777"
                width={210}
                interval={0}
                tick={{
                  fill: "#d4d4d8",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={<DarkTooltip />}
              />

              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                maxBarSize={28}
              >
                {productData.map(
                  (_, index) => (
                    <Cell
                      key={`product-${index}`}
                      fill={
                        chartColors[
                          index %
                            chartColors.length
                        ]
                      }
                    />
                  ),
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Category-wise Tickets"
          subtitle="Tickets grouped by category"
          limit={chartLimits.category}
          onLimitChange={(value) =>
            updateChartLimit(
              "category",
              value,
            )
          }
          height={getHorizontalChartHeight(
            categoryData.length,
          )}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{
                top: 10,
                right: 35,
                left: 35,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
              />

              <XAxis
                type="number"
                stroke="#777"
                allowDecimals={false}
              />

              <YAxis
                type="category"
                dataKey="name"
                stroke="#777"
                width={210}
                interval={0}
                tick={{
                  fill: "#d4d4d8",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={<DarkTooltip />}
              />

              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                maxBarSize={28}
              >
                {categoryData.map(
                  (_, index) => (
                    <Cell
                      key={`category-${index}`}
                      fill={
                        chartColors[
                          index %
                            chartColors.length
                        ]
                      }
                    />
                  ),
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Region-wise Tickets"
          subtitle="Tickets grouped by region"
          limit={chartLimits.region}
          onLimitChange={(value) =>
            updateChartLimit(
              "region",
              value,
            )
          }
          height={getHorizontalChartHeight(
            regionData.length,
            {
              minimum: 360,
              rowHeight: 58,
            },
          )}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={regionData}
              layout="vertical"
              margin={{
                top: 10,
                right: 40,
                left: 25,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
              />

              <XAxis
                type="number"
                stroke="#777"
                allowDecimals={false}
              />

              <YAxis
                type="category"
                dataKey="name"
                stroke="#777"
                width={110}
                interval={0}
                tick={{
                  fill: "#d4d4d8",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={<DarkTooltip />}
              />

              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                maxBarSize={34}
                label={{
                  position: "right",
                  fill: "#ffffff",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {regionData.map(
                  (item, index) => (
                    <Cell
                      key={`region-${item.name}-${index}`}
                      fill={getRegionColor(
                        item.name,
                      )}
                    />
                  ),
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* <ChartCard
          title="TSE / Agent-wise Tickets"
          limit={chartLimit}
          onLimitChange={setChartLimit}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value">
                {tseData.map((_, index) => (
                  <Cell key={index} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard> */}
      </section>

      <div data-pdf-section="true" data-pdf-table="true">
        <DataTable
          rows={tableRows}
          columns={columns}
        />
      </div>

      {loading ? (
        <div data-html2canvas-ignore="true" className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]">
          Loading report...
        </div>
      ) : null}
    </div>
</>
  );
}