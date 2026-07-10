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
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import ChartCard from "../../../components/ChartCard";
import MetricCard from "../../../components/MetricCard";
import ReportHeader from "../../../components/ReportHeader";
import {
  fetchGlobalRmaReport,
  syncGlobalRma,
} from "../../../services/rmaApi";

const initialFilters = {
  search: "",
  region: "",
  month: "",
  product: "",
};

const tabs = [
  { key: "summary", label: "Summary" },
  { key: "US RMA", label: "US RMA" },
  { key: "EMEA RMA", label: "EMEA RMA" },
];

const columns = [
  { key: "region", label: "Region" },
  { key: "month", label: "Month" },
  { key: "product", label: "Product" },
  { key: "description", label: "Description" },
  { key: "actualRmaReplacement", label: "Actual RMA Replacement" },
  { key: "dStockUnitsReceived", label: "D Stock Units Received" },
  { key: "aStockSentOut", label: "A-Stock Sent Out" },
  { key: "rmaUnitsSentOut", label: "RMA Units Sent Out" },
  { key: "bStockSentOut", label: "B-Stock Sent Out" },
  { key: "dStock", label: "D - Stock" },
  { key: "bStock", label: "B - Stock" },
  { key: "aStock", label: "A - Stock" },
  { key: "pendingToShip", label: "Pending to Ship" },
  { key: "pendingToReceive", label: "Pending to Receive" },
  { key: "googleDriveRmaCases", label: "Google Drive RMA Cases" },
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
    <div className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl">
      <p className="font-black text-white">{label || payload[0]?.name}</p>
      <p className="mt-1 font-bold text-[#00dcc5]">
        Value: {payload[0]?.value ?? 0}
      </p>
    </div>
  );
}

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>

      <select value={value || ""} onChange={onChange} className="input">
        <option value="">All</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function RmaFilters({ filters, setFilters, options }) {
  const update = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <section className="dashboard-card p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
            Filters
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Global RMA Filters
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Filter by region tab, month, product and search.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFilters(initialFilters)}
          className="btn border border-zinc-800 bg-black text-zinc-300 hover:border-[#00dcc5]"
        >
          Reset Filters
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block xl:col-span-2">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Search
          </span>

          <input
            value={filters.search || ""}
            onChange={(event) => update("search", event.target.value)}
            className="input"
            placeholder="Search product or description..."
          />
        </label>

        <SelectField
          label="Region"
          value={filters.region}
          onChange={(event) => update("region", event.target.value)}
          options={options.regions || []}
        />

        <SelectField
          label="Month"
          value={filters.month}
          onChange={(event) => update("month", event.target.value)}
          options={options.months || []}
        />

        <SelectField
          label="Product"
          value={filters.product}
          onChange={(event) => update("product", event.target.value)}
          options={options.products || []}
        />
      </div>
    </section>
  );
}

function RmaTable({ rows }) {
  return (
    <section className="dashboard-card overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
          Report Table
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          Global RMA Data
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          Showing {rows.length} RMA rows.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="soft-table min-w-[1700px]">
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
                  No RMA records found.
                </td>
              </tr>
            ) : null}

            {rows.map((row, index) => (
              <tr key={`${row.region}-${row.product}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>{row[column.key] ?? "-"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function GlobalRmaPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const effectiveFilters = useMemo(() => {
    if (activeTab === "summary") return filters;

    return {
      ...filters,
      region: activeTab,
    };
  }, [filters, activeTab]);

  const analytics = report?.analytics || {};
  const rows = report?.rows || [];
  const options = report?.filters || {};

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchGlobalRmaReport({
        ...effectiveFilters,
        limit: 5000,
      });

      setReport(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load Global RMA report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError("");

    try {
      await syncGlobalRma();
      await loadReport();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Global RMA sync failed."
      );
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [filterKey, activeTab]);

  function exportExcel() {
    if (!rows.length) {
      window.alert("No RMA rows to export.");
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

    XLSX.utils.book_append_sheet(wb, ws, "Global RMA");
    XLSX.writeFile(wb, "global-rma-report.xlsx");
  }

  function exportPdf() {
    const doc = new jsPDF("landscape");

    doc.text("Global RMA Report", 14, 14);
    doc.setFontSize(8);
    doc.text(`Total Records: ${rows.length}`, 14, 20);

    autoTable(doc, {
      startY: 26,
      head: [columns.map((column) => column.label)],
      body: rows.map((row) => columns.map((column) => row[column.key] ?? "-")),
      styles: { fontSize: 5 },
      headStyles: {
        fillColor: [0, 220, 197],
        textColor: [0, 0, 0],
      },
    });

    doc.save("global-rma-report.pdf");
  }

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Global RMA"
        subtitle="US RMA and EMEA RMA analytics with product, month, stock movement, pending status and Google Drive RMA case tracking."
        syncedAt={report?.syncedAt}
        loading={syncing}
        onSync={handleSync}
        onUnsync={() => setReport(null)}
        onExcel={exportExcel}
        onPdf={exportPdf}
      />

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {error}
        </div>
      ) : null}

      <section className="dashboard-card p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "rounded-full px-5 py-2 text-sm font-black transition",
                activeTab === tab.key
                  ? "bg-[#00dcc5] text-black"
                  : "border border-zinc-800 bg-black text-zinc-400 hover:border-[#00dcc5] hover:text-white",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <RmaFilters filters={filters} setFilters={setFilters} options={options} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Actual RMA Replacement"
          value={analytics.actualRmaReplacement}
          hint="Total replacements"
        />

        <MetricCard
          label="Google Drive Cases"
          value={analytics.googleDriveRmaCases}
          hint="RMA case count"
        />

        <MetricCard
          label="Pending to Ship"
          value={analytics.pendingToShip}
          hint="Open shipping"
        />

        <MetricCard
          label="Pending to Receive"
          value={analytics.pendingToReceive}
          hint="Open receiving"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Month-wise Actual RMA">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byMonth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value">
                {(analytics.byMonth || []).map((_, index) => (
                  <Cell
                    key={index}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Product-wise Actual RMA">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(analytics.byProduct || []).slice(0, 25)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value">
                {(analytics.byProduct || []).slice(0, 25).map((_, index) => (
                  <Cell
                    key={index}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Stock Summary">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analytics.stockSummary || []}
                dataKey="value"
                nameKey="name"
                outerRadius={105}
                label
              >
                {(analytics.stockSummary || []).map((_, index) => (
                  <Cell
                    key={index}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sent Out Summary">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.sentOutSummary || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value">
                {(analytics.sentOutSummary || []).map((_, index) => (
                  <Cell
                    key={index}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pending Summary">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.pendingSummary || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value">
                {(analytics.pendingSummary || []).map((_, index) => (
                  <Cell
                    key={index}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Region-wise RMA">
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
                    key={index}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <RmaTable rows={rows} />

      {loading ? (
        <div className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]">
          Loading Global RMA...
        </div>
      ) : null}
    </div>
  );
}