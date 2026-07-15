import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Globe2,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  ShieldX,
  UserRound,
  Wrench,
} from "lucide-react";

import * as XLSX from "xlsx";

import ChartCard from "../../../components/ChartCard";
import DataTable from "../../../components/DataTable";
import MetricCard from "../../../components/MetricCard";
import ReportHeader from "../../../components/ReportHeader";
import { exportDashboardPdf } from "../../../utils/dashboardPdfExport";

import {
  fetchGlobalRmaReport,
  syncGlobalRma,
} from "../../../services/globalrmaApi";

import GlobalRmaFilters from "./GlobalRmaFilters";

const COLORS = [
  "#00dcc5",
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#f43f5e",
  "#84cc16",
  "#06b6d4",
  "#eab308",
];

const initialFilters = {
  search: "",
  region: "",
  warrantyStatus: "",
  product: "",
  rmaStatus: "",
  actionTaken: "",
  faultCategory: "",
  customerType: "",
  year: "",
  month: "",
  dateFrom: "",
  dateTo: "",
};

const tableColumns = [
  {
    key: "region",
    label: "Region",
  },
  {
    key: "rmaNumber",
    label: "RMA Number",
  },
  {
    key: "entryDate",
    label: "Entry Date",
  },
  {
    key: "processedDate",
    label: "RO Processed Date",
  },
  {
    key: "returnYear",
    label: "Year",
  },
  {
    key: "warrantyStatus",
    label: "INW / OOW",
  },
  {
    key: "productName",
    label: "Product Name",
  },
  {
    key: "productSku",
    label: "Product SKU",
  },
  {
    key: "productWithFault",
    label: "Product with Fault",
  },
  {
    key: "serialNumber",
    label: "Faulty Serial Number",
  },
  {
    key: "replacementSku",
    label: "Replacement SKU",
  },
  {
    key: "deviceName",
    label: "Device Name",
  },
  {
    key: "rmaType",
    label: "RMA Type",
  },
  {
    key: "stockType",
    label: "Stock Type",
  },
  {
    key: "quantity",
    label: "Quantity",
  },
  {
    key: "faultDescription",
    label: "Return Reason",
  },
  {
    key: "faultCategory",
    label: "Fault Category",
  },
  {
    key: "actionTaken",
    label: "Action Taken",
  },
  {
    key: "rmaStatus",
    label: "RMA Status",
  },
  {
    key: "customerReturnTrackingNumber",
    label: "Customer Return Tracking",
  },
  {
    key: "trackingNumber",
    label: "Tracking Number",
  },
  {
    key: "replacementOrderNumber",
    label: "Replacement Order Number",
  },
  {
    key: "replacementSerialNumber",
    label: "Replacement Serial Number",
  },
  {
    key: "customerType",
    label: "Reseller / Customer",
  },
  {
    key: "country",
    label: "Country",
  },
  {
    key: "state",
    label: "State",
  },
  {
    key: "city",
    label: "City",
  },
  {
    key: "postCode",
    label: "Post Code",
  },
  {
    key: "roNotes",
    label: "RO Notes",
  },
];
function DarkTooltip({
  active,
  payload,
  label,
  valueLabel = "RMA",
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="min-w-[150px] rounded-xl border border-zinc-800 bg-black p-3 shadow-2xl">
      <p className="text-xs font-black text-[#00dcc5]">
        {label || payload[0]?.name || "Record"}
      </p>

      {payload.map((item, index) => (
        <p
          key={`${item.dataKey || item.name}-${index}`}
          className="mt-1 text-xs font-bold text-white"
        >
          {item.name || valueLabel}: {item.value ?? 0}
        </p>
      ))}
    </div>
  );
}

function PieLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  value,
}) {
  const radius = outerRadius + 22;
  const radians = Math.PI / 180;

  const x =
    cx + radius * Math.cos(-midAngle * radians);

  const y =
    cy + radius * Math.sin(-midAngle * radians);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={800}
    >
      {name}: {value}
    </text>
  );
}

function applyChartLimit(
  data = [],
  limit = "10",
  {
    valueKey = "value",
    sort = true,
  } = {},
) {
  if (!Array.isArray(data)) {
    return [];
  }

  const preparedData = sort
    ? [...data].sort(
        (a, b) =>
          Number(b?.[valueKey] || 0) -
          Number(a?.[valueKey] || 0),
      )
    : [...data];

  if (limit === "all") {
    return preparedData;
  }

  const parsedLimit = Number(limit);

  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    return preparedData;
  }

  return preparedData.slice(0, parsedLimit);
}

function calculateHorizontalChartHeight(
  rowCount,
  {
    minimum = 400,
    rowHeight = 42,
    extra = 90,
    maximum = 2400,
  } = {},
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      Number(rowCount || 0) * rowHeight + extra,
    ),
  );
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function buildYearCategoryChart(data = []) {
  const years = Array.from(
    new Set(
      data
        .map((item) => item.year)
        .filter((year) => year && year !== "Unknown"),
    ),
  ).sort();

  const categoryTotals = data.reduce((result, item) => {
    result[item.category] =
      (result[item.category] || 0) + Number(item.value || 0);

    return result;
  }, {});

  const categories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category]) => category);

  const rows = years.map((year) => {
    const row = {
      year,
    };

    categories.forEach((category) => {
      const match = data.find(
        (item) =>
          item.year === year &&
          item.category === category,
      );

      row[category] = Number(match?.value || 0);
    });

    return row;
  });

  return {
    rows,
    categories,
  };
}

function buildMonthCategoryChart(data = []) {
  const categoryTotals = data.reduce((result, item) => {
    result[item.category] =
      (result[item.category] || 0) + Number(item.value || 0);

    return result;
  }, {});

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category]) => category);

  const periodMap = new Map();

  data.forEach((item) => {
    if (
      !item.year ||
      item.year === "Unknown" ||
      !item.month ||
      item.month === "Unknown"
    ) {
      return;
    }

    const periodKey = `${item.year}-${String(
      item.monthNumber || 0,
    ).padStart(2, "0")}`;

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        periodKey,
        period: `${item.month.slice(0, 3)} ${item.year}`,
        year: item.year,
        monthNumber: item.monthNumber,
      });
    }

    if (topCategories.includes(item.category)) {
      const row = periodMap.get(periodKey);
      row[item.category] = Number(item.value || 0);
    }
  });

  const rows = Array.from(periodMap.values())
    .sort((a, b) =>
      a.periodKey.localeCompare(b.periodKey),
    )
    .map((row) => {
      topCategories.forEach((category) => {
        if (row[category] === undefined) {
          row[category] = 0;
        }
      });

      return row;
    });

  return {
    rows,
    categories: topCategories,
  };
}


function TrendArrow({ trend }) {
  if (trend === "Up") {
    return (
      <ArrowUpRight
        size={22}
        className="text-[#00dcc5]"
      />
    );
  }

  if (trend === "Down") {
    return (
      <ArrowDownRight
        size={22}
        className="text-orange-400"
      />
    );
  }

  return (
    <ArrowRight
      size={22}
      className="text-zinc-500"
    />
  );
}

function TrendSparkline({
  points = [],
  high = 0,
}) {
  return (
    <div className="h-12 min-w-[220px]">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={points}
          margin={{
            top: 4,
            right: 4,
            bottom: 4,
            left: 4,
          }}
        >
          <Line
            type="linear"
            dataKey="value"
            stroke="#71717a"
            strokeWidth={1.25}
            dot={(props) => {
              const {
                cx,
                cy,
                payload,
                index,
              } = props;

              const isLast =
                index === points.length - 1;

              const isHigh =
                high > 0 &&
                payload?.value === high;

              let fill = "#3b82f6";

              if (isHigh) {
                fill = "#ff2f6d";
              }

              if (isLast) {
                fill = "#84ff28";
              }

              return (
                <circle
                  key={`${payload?.periodKey}-${index}`}
                  cx={cx}
                  cy={cy}
                  r={isHigh || isLast ? 3.2 : 2.5}
                  fill={fill}
                  stroke="none"
                />
              );
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendTableCard({
  title,
  firstColumnLabel,
  rows = [],
  limit,
  onLimitChange,
}) {
  return (
    <section className="dashboard-card min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 bg-black px-5 py-4">
        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">
          {title}
        </h3>

        <select
          value={limit}
          onChange={(event) =>
            onLimitChange?.(event.target.value)
          }
          className="h-9 rounded-full border border-zinc-800 bg-black px-3 text-xs font-black text-zinc-300 outline-none transition hover:border-[#00dcc5] focus:border-[#00dcc5]"
        >
          <option value="10">Top 10</option>
          <option value="25">Top 25</option>
          <option value="50">Top 50</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="overflow-auto">
        <table className="min-w-[700px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-900 bg-zinc-950">
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-zinc-400">
                {firstColumnLabel}
              </th>

              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-zinc-400">
                Return month trend
              </th>

              <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.08em] text-zinc-400">
                Last
              </th>

              <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.08em] text-zinc-400">
                High
              </th>

              <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.08em] text-zinc-400">
                Trend
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((item, index) => (
              <tr
                key={`${item.name}-${index}`}
                className="border-b border-zinc-900 odd:bg-zinc-950/40"
              >
                <td className="max-w-[220px] px-4 py-3 text-xs font-bold text-zinc-200">
                  {item.name}
                </td>

                <td className="px-4 py-2">
                  <TrendSparkline
                    points={item.points}
                    high={item.high}
                  />
                </td>

                <td className="px-4 py-3 text-center text-sm font-black text-white">
                  {item.last}
                </td>

                <td className="px-4 py-3 text-center text-sm font-black text-[#ff2f6d]">
                  {item.high}
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <TrendArrow
                      trend={item.trend}
                    />
                  </div>
                </td>
              </tr>
            ))}

            {!rows.length ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-sm font-bold text-zinc-500"
                >
                  No 12-month trend data available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}


function ProductDisplaySelector({
  value,
  onChange,
}) {
  return (
    <div className="inline-flex rounded-full border border-zinc-800 bg-black p-1">
      <button
        type="button"
        onClick={() => onChange("name")}
        className={[
          "rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] transition",
          value === "name"
            ? "bg-[#00dcc5] text-black"
            : "text-zinc-400 hover:text-white",
        ].join(" ")}
      >
        Product Name
      </button>

      <button
        type="button"
        onClick={() => onChange("sku")}
        className={[
          "rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] transition",
          value === "sku"
            ? "bg-[#00dcc5] text-black"
            : "text-zinc-400 hover:text-white",
        ].join(" ")}
      >
        Product SKU
      </button>
    </div>
  );
}

export default function GlobalRmaPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const [chartLimits, setChartLimits] = useState({
    warranty: "10",
    rmaStatus: "10",
    actionTaken: "10",
    customerType: "10",
    productTrend: "10",
    faultTrend: "10",
    product12Month: "10",
    fault12Month: "10",
    dateTrend: "10",
    yearCategory: "10",
    monthlyCategory: "10",
  });

  const [
    productDisplayMode,
    setProductDisplayMode,
  ] = useState("name");

  const filterKey = useMemo(
    () => JSON.stringify(filters),
    [filters],
  );

  const analytics = report?.analytics || {};
  const rows = report?.rows || [];
  const options = report?.filters || {};

  const warrantyRows = useMemo(
    () =>
      applyChartLimit(
        analytics.byWarrantyStatus || [],
        chartLimits.warranty,
      ),
    [
      analytics.byWarrantyStatus,
      chartLimits.warranty,
    ],
  );

  const rmaStatusRows = useMemo(
    () =>
      applyChartLimit(
        analytics.byRmaStatus || [],
        chartLimits.rmaStatus,
      ),
    [
      analytics.byRmaStatus,
      chartLimits.rmaStatus,
    ],
  );

  const actionRows = useMemo(
    () =>
      applyChartLimit(
        analytics.byActionTaken || [],
        chartLimits.actionTaken,
      ),
    [
      analytics.byActionTaken,
      chartLimits.actionTaken,
    ],
  );

  const customerTypeRows = useMemo(
    () =>
      applyChartLimit(
        analytics.byAccountType ||
          analytics.byCustomerType ||
          [],
        chartLimits.customerType,
      ),
    [
      analytics.byAccountType,
      analytics.byCustomerType,
      chartLimits.customerType,
    ],
  );

  /*
   * Existing count-wise Product High / Low chart.
   * The user can switch between Device Name and Product SKU.
   */
  const productTrend = useMemo(
    () => {
      const sourceData =
        productDisplayMode === "sku"
          ? analytics.productSkuTrend ||
            analytics.productTrend ||
            []
          : analytics.productNameTrend ||
            analytics.productTrend ||
            [];

      return applyChartLimit(
        sourceData,
        chartLimits.productTrend,
      );
    },
    [
      analytics.productNameTrend,
      analytics.productSkuTrend,
      analytics.productTrend,
      chartLimits.productTrend,
      productDisplayMode,
    ],
  );

  /*
   * Existing count-wise Fault Category High / Low chart.
   * Do not connect this to the 12-month trend table.
   */
  const faultTrend = useMemo(
    () =>
      applyChartLimit(
        analytics.faultCategoryTrend || [],
        chartLimits.faultTrend,
      ),
    [
      analytics.faultCategoryTrend,
      chartLimits.faultTrend,
    ],
  );

  const product12MonthRows = useMemo(
    () => {
      const sourceData =
        productDisplayMode === "sku"
          ? analytics.productSkuLast12MonthTrends ||
            analytics.productLast12MonthTrends ||
            []
          : analytics.productNameLast12MonthTrends ||
            analytics.productLast12MonthTrends ||
            [];

      return applyChartLimit(
        sourceData,
        chartLimits.product12Month,
      );
    },
    [
      analytics.productNameLast12MonthTrends,
      analytics.productSkuLast12MonthTrends,
      analytics.productLast12MonthTrends,
      chartLimits.product12Month,
      productDisplayMode,
    ],
  );

  const fault12MonthRows = useMemo(
    () =>
      applyChartLimit(
        analytics.faultCategoryLast12MonthTrends ||
          [],
        chartLimits.fault12Month,
      ),
    [
      analytics.faultCategoryLast12MonthTrends,
      chartLimits.fault12Month,
    ],
  );

  const dateWiseRma = useMemo(
    () =>
      applyChartLimit(
        analytics.dateWiseRma || [],
        chartLimits.dateTrend,
        {
          sort: false,
        },
      ),
    [
      analytics.dateWiseRma,
      chartLimits.dateTrend,
    ],
  );

  const limitedYearCategoryRows = useMemo(
    () =>
      applyChartLimit(
        analytics.yearCategoryWiseRma || [],
        chartLimits.yearCategory,
      ),
    [
      analytics.yearCategoryWiseRma,
      chartLimits.yearCategory,
    ],
  );

  const yearCategoryChart = useMemo(
    () =>
      buildYearCategoryChart(
        limitedYearCategoryRows,
      ),
    [limitedYearCategoryRows],
  );

  const limitedMonthlyCategoryRows = useMemo(
    () =>
      applyChartLimit(
        analytics.monthCategoryWiseRma || [],
        chartLimits.monthlyCategory,
        {
          sort: false,
        },
      ),
    [
      analytics.monthCategoryWiseRma,
      chartLimits.monthlyCategory,
    ],
  );

  const monthCategoryChart = useMemo(
    () =>
      buildMonthCategoryChart(
        limitedMonthlyCategoryRows,
      ),
    [limitedMonthlyCategoryRows],
  );

  const productTrendHeight = useMemo(
    () =>
      calculateHorizontalChartHeight(
        productTrend.length,
        {
          minimum: 420,
          rowHeight: 42,
          extra: 100,
          maximum: 2500,
        },
      ),
    [productTrend.length],
  );

  const faultTrendHeight = useMemo(
    () =>
      calculateHorizontalChartHeight(
        faultTrend.length,
        {
          minimum: 420,
          rowHeight: 44,
          extra: 100,
          maximum: 2200,
        },
      ),
    [faultTrend.length],
  );

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchGlobalRmaReport({
        ...filters,
        limit: 20000,
      });

      setReport(data);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to load Global RMA report.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleResetFilters() {
    setFilters(initialFilters);
  }

  function updateChartLimit(chartName, value) {
    setChartLimits((current) => ({
      ...current,
      [chartName]: value,
    }));
  }

  async function handleSync() {
    setSyncing(true);
    setError("");

    try {
      await syncGlobalRma();
      await loadReport();
    } catch (syncError) {
      setError(
        getErrorMessage(
          syncError,
          "Unable to synchronize Global RMA sheet.",
        ),
      );
    } finally {
      setSyncing(false);
    }
  }

  function exportExcel() {
    const exportRows = rows.map((row) => {
      return tableColumns.reduce(
        (exportRow, column) => {
          exportRow[column.label] =
            row[column.key] ?? "";

          return exportRow;
        },
        {},
      );
    });

    const workbook = XLSX.utils.book_new();

    const recordsSheet =
      XLSX.utils.json_to_sheet(exportRows);

    XLSX.utils.book_append_sheet(
      workbook,
      recordsSheet,
      "Global RMA Records",
    );

    const summaryRows = [
      {
        Metric: "Total Global RMA",
        Value: analytics.totalRma || 0,
      },
      {
        Metric: "USA RMA",
        Value: analytics.totalUsa || 0,
      },
      {
        Metric: "EMEA RMA",
        Value: analytics.totalEmea || 0,
      },
      {
        Metric: "INW",
        Value: analytics.totalInWarranty || 0,
      },
      {
        Metric: "OOW",
        Value: analytics.totalOutOfWarranty || 0,
      },
      {
        Metric: "Replaced",
        Value: analytics.totalReplaced || 0,
      },
      {
        Metric: "Repaired",
        Value: analytics.totalRepaired || 0,
      },
      {
        Metric: "Customers",
        Value: analytics.totalCustomers || 0,
      },
      {
        Metric: "Resellers",
        Value: analytics.totalResellers || 0,
      },
      {
        Metric: "Distributors",
        Value: analytics.totalDistributors || 0,
      },
    ];

    const summarySheet =
      XLSX.utils.json_to_sheet(summaryRows);

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary",
    );

    XLSX.writeFile(
      workbook,
      "global-rma-report.xlsx",
    );
  }

  async function exportPdf() {
    setError("");

    try {
      await exportDashboardPdf({
        rootId: "global-rma-pdf-content",
        title: "Global RMA Dashboard",
        subtitle:
          "Unified USA and EMEA RMA analytics",
        filename: "global-rma-dashboard",
        recordCount:
          report?.total ?? rows.length,
        syncedAt:
          report?.syncedAt,
      });
    } catch (pdfError) {
      setError(
        pdfError?.message ||
          "Unable to export dashboard PDF.",
      );
    }
  }

  const sourceCounts =
    report?.sourceCounts || {};

  return (
    <div
      id="global-rma-pdf-content"
      className="space-y-6"
    >
      <div data-html2canvas-ignore="true">
        <ReportHeader
          eyebrow="Google Sheet Analytics"
        title="Global RMA"
        description="Unified USA and EMEA RMA analysis from two Google Sheet tabs."
        loading={loading}
        syncing={syncing}
        syncedAt={report?.syncedAt}
        onRefresh={loadReport}
        onSync={handleSync}
        onExcel={exportExcel}
          onPdf={exportPdf}
        />
      </div>

      {error ? (
        <div
          data-html2canvas-ignore="true"
          className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
          {error}
        </div>
      ) : null}

      {/* <section className="dashboard-card overflow-hidden">
        <div className="atomos-grid-bg atomos-glow p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#00dcc5]/30 bg-[#00dcc5]/10 text-[#00dcc5]">
                  <Globe2 size={24} />
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#00dcc5]">
                    Unified RMA dataset
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-white">
                    USA + EMEA
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                Both source tabs are merged by the backend.
                There are no separate dashboard tabs. Use the
                Region filter to review USA, EMEA or combined
                Global RMA performance.
              </p>
            </div>

            <div className="grid min-w-[280px] grid-cols-3 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-black/80 p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  USA rows
                </p>

                <p className="mt-2 text-xl font-black text-white">
                  {sourceCounts.USA ?? analytics.totalUsa ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/80 p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  EMEA rows
                </p>

                <p className="mt-2 text-xl font-black text-white">
                  {sourceCounts.EMEA ?? analytics.totalEmea ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-[#00dcc5]/30 bg-[#00dcc5]/10 p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#00dcc5]">
                  Merged
                </p>

                <p className="mt-2 text-xl font-black text-white">
                  {sourceCounts.total ??
                    report?.totalSourceRows ??
                    0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      <div data-html2canvas-ignore="true">
        <GlobalRmaFilters
          filters={filters}
        options={options}
        onChange={handleFilterChange}
          onReset={handleResetFilters}
        />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total Global RMA"
          value={analytics.totalRma || 0}
          hint="Filtered USA and EMEA records"
          icon={FileSpreadsheet}
        />

        <MetricCard
          title="USA RMA"
          value={analytics.totalUsa || 0}
          hint="USA source records"
          icon={Globe2}
        />

        <MetricCard
          title="EMEA RMA"
          value={analytics.totalEmea || 0}
          hint="EMEA source records"
          icon={Globe2}
        />

        <MetricCard
          title="In Warranty"
          value={analytics.totalInWarranty || 0}
          hint="INW records"
          icon={ShieldCheck}
        />

        <MetricCard
          title="Out of Warranty"
          value={analytics.totalOutOfWarranty || 0}
          hint="OOW records"
          icon={ShieldX}
        />

        <MetricCard
          title="Replaced"
          value={analytics.totalReplaced || 0}
          hint="Replacement actions"
          icon={PackageCheck}
        />

        <MetricCard
          title="Repaired"
          value={analytics.totalRepaired || 0}
          hint="Repair actions"
          icon={Wrench}
        />

        <MetricCard
          title="Customers"
          value={analytics.totalCustomers || 0}
          hint="Customer RMA records"
          icon={UserRound}
        />

        <MetricCard
          title="Resellers"
          value={analytics.totalResellers || 0}
          hint="Reseller RMA records"
          icon={Building2}
        />

        <MetricCard
          title="Distributors"
          value={analytics.totalDistributors || 0}
          hint="Distributor RMA records"
          icon={Building2}
        />

        <MetricCard
          title="Dated RMA"
          value={analytics.datedRmaCount || 0}
          hint="Records with valid return date"
          icon={CalendarDays}
        />
      </section>

      <section className="grid min-w-0 items-start gap-6 2xl:grid-cols-2">
        <ChartCard
          title="INW / OOW by Region"
          subtitle="Warranty status distribution across Global RMA"
          limit={chartLimits.warranty}
          onLimitChange={(value) =>
            updateChartLimit("warranty", value)
          }
          height={360}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={warrantyRows}
              margin={{
                top: 20,
                right: 20,
                left: 0,
                bottom: 20,
              }}
            >
              <CartesianGrid
                stroke="#18181b"
                strokeDasharray="4 4"
              />

              <XAxis
                dataKey="name"
                tick={{
                  fill: "#a1a1aa",
                  fontSize: 11,
                }}
              />

              <YAxis
                allowDecimals={false}
                tick={{
                  fill: "#a1a1aa",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={
                  <DarkTooltip valueLabel="RMA" />
                }
              />

              <Bar
                dataKey="value"
                name="RMA"
                radius={[8, 8, 0, 0]}
              >
                {warrantyRows.map(
                  (_, index) => (
                    <Cell
                      key={`warranty-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ),
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="RMA by Status"
          subtitle="Atomos products grouped by current RMA status"
          limit={chartLimits.rmaStatus}
          onLimitChange={(value) =>
            updateChartLimit("rmaStatus", value)
          }
          height={360}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rmaStatusRows}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={2}
                label={PieLabel}
              >
                {rmaStatusRows.map(
                  (_, index) => (
                    <Cell
                      key={`status-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ),
                )}
              </Pie>

              <Tooltip
                content={
                  <DarkTooltip valueLabel="RMA" />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Action Taken"
          subtitle="Replaced, repaired, returned and other actions"
          limit={chartLimits.actionTaken}
          onLimitChange={(value) =>
            updateChartLimit("actionTaken", value)
          }
          height={360}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={actionRows}
              layout="vertical"
              margin={{
                top: 10,
                right: 30,
                left: 35,
                bottom: 10,
              }}
            >
              <CartesianGrid
                stroke="#18181b"
                strokeDasharray="4 4"
              />

              <XAxis
                type="number"
                allowDecimals={false}
                tick={{
                  fill: "#a1a1aa",
                  fontSize: 11,
                }}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={105}
                tick={{
                  fill: "#d4d4d8",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={
                  <DarkTooltip valueLabel="RMA" />
                }
              />

              <Bar
                dataKey="value"
                name="RMA"
                radius={[0, 8, 8, 0]}
              >
                {actionRows.map(
                  (_, index) => (
                    <Cell
                      key={`action-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ),
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="RMA by Customer Channel"
          subtitle="Customer, reseller and distributor RMA comparison"
          limit={chartLimits.customerType}
          onLimitChange={(value) =>
            updateChartLimit("customerType", value)
          }
          height={360}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={customerTypeRows}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={PieLabel}
              >
                {customerTypeRows.map(
                  (_, index) => (
                    <Cell
                      key={`customer-channel-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ),
                )}
              </Pie>

              <Tooltip
                content={
                  <DarkTooltip valueLabel="RMA" />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section data-html2canvas-ignore="true" className="dashboard-card p-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#00dcc5]">
              Product chart display
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Use Device Name for readable labels or Product with fault for SKU codes.
            </p>
          </div>

          <ProductDisplaySelector
            value={productDisplayMode}
            onChange={setProductDisplayMode}
          />
        </div>
      </section>

      <section className="grid min-w-0 items-start gap-6 2xl:grid-cols-2">
        <ChartCard
          title="RMA Product Trend — High / Low"
          subtitle={
            productDisplayMode === "sku"
              ? "Count-wise RMA cases by Product with fault SKU"
              : "Count-wise RMA cases by Device Name"
          }
          limit={chartLimits.productTrend}
          onLimitChange={(value) =>
            updateChartLimit("productTrend", value)
          }
          height={productTrendHeight}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={productTrend}
              layout="vertical"
              margin={{
                top: 10,
                right: 35,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid
                stroke="#18181b"
                strokeDasharray="4 4"
              />

              <XAxis
                type="number"
                allowDecimals={false}
                tick={{
                  fill: "#a1a1aa",
                  fontSize: 11,
                }}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={220}
                interval={0}
                tick={{
                  fill: "#d4d4d8",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  return (
                    <div className="rounded-xl border border-zinc-800 bg-black p-3 shadow-2xl">
                      <p className="text-xs font-black text-[#00dcc5]">
                        {label}
                      </p>

                      <p className="mt-1 text-xs font-bold text-white">
                        RMA: {payload[0]?.value || 0}
                      </p>

                      <p className="mt-1 text-xs font-black text-zinc-400">
                        Trend:{" "}
                        {payload[0]?.payload?.trend ||
                          "Low"}
                      </p>
                    </div>
                  );
                }}
              />

              <Bar
                dataKey="value"
                name="RMA"
                radius={[0, 8, 8, 0]}
                maxBarSize={26}
              >
                {productTrend.map((item, index) => (
                  <Cell
                    key={`product-${item.name}-${index}`}
                    fill={
                      item.trend === "High"
                        ? "#00dcc5"
                        : "#3f3f46"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-3 flex flex-wrap gap-3 px-2 text-xs font-bold">
            <span className="inline-flex items-center gap-2 text-[#00dcc5]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00dcc5]" />
              High RMA
            </span>

            <span className="inline-flex items-center gap-2 text-zinc-500">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              Low RMA
            </span>
          </div>
        </ChartCard>

        <ChartCard
          title="Fault Category Trend — High / Low"
          subtitle="Count-wise RMA cases grouped by aligned fault category"
          limit={chartLimits.faultTrend}
          onLimitChange={(value) =>
            updateChartLimit("faultTrend", value)
          }
          height={faultTrendHeight}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={faultTrend}
              layout="vertical"
              margin={{
                top: 10,
                right: 35,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid
                stroke="#18181b"
                strokeDasharray="4 4"
              />

              <XAxis
                type="number"
                allowDecimals={false}
                tick={{
                  fill: "#a1a1aa",
                  fontSize: 11,
                }}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={210}
                interval={0}
                tick={{
                  fill: "#d4d4d8",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  return (
                    <div className="rounded-xl border border-zinc-800 bg-black p-3 shadow-2xl">
                      <p className="text-xs font-black text-[#00dcc5]">
                        {label}
                      </p>

                      <p className="mt-1 text-xs font-bold text-white">
                        RMA: {payload[0]?.value || 0}
                      </p>

                      <p className="mt-1 text-xs font-black text-zinc-400">
                        Trend:{" "}
                        {payload[0]?.payload?.trend ||
                          "Low"}
                      </p>
                    </div>
                  );
                }}
              />

              <Bar
                dataKey="value"
                name="RMA"
                radius={[0, 8, 8, 0]}
                maxBarSize={26}
              >
                {faultTrend.map((item, index) => (
                  <Cell
                    key={`fault-${item.name}-${index}`}
                    fill={
                      item.trend === "High"
                        ? "#00dcc5"
                        : "#3f3f46"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-3 flex flex-wrap gap-3 px-2 text-xs font-bold">
            <span className="inline-flex items-center gap-2 text-[#00dcc5]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00dcc5]" />
              High fault volume
            </span>

            <span className="inline-flex items-center gap-2 text-zinc-500">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              Low fault volume
            </span>
          </div>
        </ChartCard>
      </section>

      <section className="grid min-w-0 items-start gap-6 2xl:grid-cols-2">
        <TrendTableCard
          title={
            productDisplayMode === "sku"
              ? "RMA Product SKU Monthly Trend Table (Last 12 Months)"
              : "RMA Product Name Monthly Trend Table (Last 12 Months)"
          }
          firstColumnLabel={
            productDisplayMode === "sku"
              ? "Product SKU"
              : "Device Name"
          }
          rows={product12MonthRows}
          limit={chartLimits.product12Month}
          onLimitChange={(value) =>
            updateChartLimit(
              "product12Month",
              value,
            )
          }
        />

        <TrendTableCard
          title="RMA Fault Category Monthly Trend Table (Last 12 Months)"
          firstColumnLabel="Fault Category"
          rows={fault12MonthRows}
          limit={chartLimits.fault12Month}
          onLimitChange={(value) =>
            updateChartLimit(
              "fault12Month",
              value,
            )
          }
        />
      </section>

      <ChartCard
        title="Return Date-wise RMA Count"
        subtitle="Daily RMA records based on Return Date"
        limit={chartLimits.dateTrend}
        onLimitChange={(value) =>
          updateChartLimit("dateTrend", value)
        }
        height={430}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={dateWiseRma}
            margin={{
              top: 20,
              right: 30,
              left: 5,
              bottom: 55,
            }}
          >
            <CartesianGrid
              stroke="#18181b"
              strokeDasharray="4 4"
            />

            <XAxis
              dataKey="date"
              angle={-35}
              textAnchor="end"
              interval={0}
              height={90}
              tick={{
                fill: "#a1a1aa",
                fontSize: 10,
              }}
            />

            <YAxis
              allowDecimals={false}
              tick={{
                fill: "#a1a1aa",
                fontSize: 11,
              }}
            />

            <Tooltip
              content={
                <DarkTooltip valueLabel="RMA" />
              }
            />

            <Line
              type="monotone"
              dataKey="value"
              name="RMA Count"
              stroke="#00dcc5"
              strokeWidth={3}
              dot={{
                fill: "#00dcc5",
                stroke: "#000000",
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Year and Category-wise RMA Count"
        subtitle="Annual RMA count grouped by aligned fault category"
        limit={chartLimits.yearCategory}
        onLimitChange={(value) =>
          updateChartLimit("yearCategory", value)
        }
        height={450}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={yearCategoryChart.rows}
            margin={{
              top: 20,
              right: 25,
              left: 0,
              bottom: 20,
            }}
          >
            <CartesianGrid
              stroke="#18181b"
              strokeDasharray="4 4"
            />

            <XAxis
              dataKey="year"
              tick={{
                fill: "#a1a1aa",
                fontSize: 11,
              }}
            />

            <YAxis
              allowDecimals={false}
              tick={{
                fill: "#a1a1aa",
                fontSize: 11,
              }}
            />

            <Tooltip
              content={
                <DarkTooltip valueLabel="RMA" />
              }
            />

            <Legend
              wrapperStyle={{
                color: "#ffffff",
                fontSize: "11px",
              }}
            />

            {yearCategoryChart.categories.map(
              (category, index) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="fault-category"
                  fill={COLORS[index % COLORS.length]}
                  radius={
                    index ===
                    yearCategoryChart.categories.length - 1
                      ? [6, 6, 0, 0]
                      : undefined
                  }
                />
              ),
            )}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Monthly Category RMA Trend"
        subtitle="Return month and year analysis by fault category"
        limit={chartLimits.monthlyCategory}
        onLimitChange={(value) =>
          updateChartLimit("monthlyCategory", value)
        }
        height={470}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={monthCategoryChart.rows}
            margin={{
              top: 20,
              right: 25,
              left: 0,
              bottom: 50,
            }}
          >
            <CartesianGrid
              stroke="#18181b"
              strokeDasharray="4 4"
            />

            <XAxis
              dataKey="period"
              angle={-30}
              textAnchor="end"
              tick={{
                fill: "#a1a1aa",
                fontSize: 10,
              }}
            />

            <YAxis
              allowDecimals={false}
              tick={{
                fill: "#a1a1aa",
                fontSize: 11,
              }}
            />

            <Tooltip
              content={
                <DarkTooltip valueLabel="RMA" />
              }
            />

            <Legend
              wrapperStyle={{
                color: "#ffffff",
                fontSize: "11px",
              }}
            />

            {monthCategoryChart.categories.map(
              (category, index) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2.5}
                  dot={{
                    r: 3,
                  }}
                  activeDot={{
                    r: 5,
                  }}
                />
              ),
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <section
        data-html2canvas-ignore="true"
        className="dashboard-card overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#00dcc5]">
              Global RMA records
            </p>

            <h2 className="mt-1 text-lg font-black text-white">
              Merged USA and EMEA data
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Showing {rows.length} of{" "}
              {report?.total ?? rows.length} filtered records.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-zinc-300 transition hover:border-[#00dcc5] hover:text-[#00dcc5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncing ? (
              <RefreshCcw
                size={14}
                className="animate-spin"
              />
            ) : (
              <CheckCircle2 size={14} />
            )}

            {syncing ? "Syncing" : "Sync sheet"}
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-bold text-zinc-400">
              <RefreshCcw
                size={18}
                className="animate-spin text-[#00dcc5]"
              />

              Loading Global RMA report...
            </div>
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            rows={rows}
          />
        )}
      </section>
    </div>
  );
}