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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import ChartCard from "../../../components/ChartCard";
import MetricCard from "../../../components/MetricCard";
import ReportHeader from "../../../components/ReportHeader";
import { fetchSocialReport, syncSocial } from "../../../services/socialApi";

const initialFilters = {
  search: "",
  year: "",
  month: "",
  fromDate: "",
  toDate: "",
  region: "",
  country: "",
  product: "",
  category: "",
  status: "",
};

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

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
    <div className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl">
      <p className="font-black text-white">{label || payload[0]?.name}</p>
      <p className="mt-1 font-bold text-[#00dcc5]">
        Queries: {payload[0]?.value ?? 0}
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
        {options.map((item) => {
          const value = typeof item === "object" ? String(item.value) : String(item);
          const label = typeof item === "object" ? item.label : String(item);

          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>

      <input
        type="date"
        value={value || ""}
        onChange={onChange}
        onFocus={(event) => event.target.showPicker?.()}
        onClick={(event) => event.target.showPicker?.()}
        className="input cursor-pointer appearance-none [color-scheme:dark]"
      />
    </label>
  );
}

function SocialFilters({ filters, setFilters, options }) {
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

          <h2 className="mt-1 text-xl font-black">Social Filters</h2>

          <p className="mt-1 text-xs text-zinc-500">
            Filter social records by date, region, country, product, category and status.
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
            placeholder="Search customer, post/query, response, product..."
          />
        </label>

        <SelectField label="Year" value={filters.year} onChange={(e) => update("year", e.target.value)} options={options.years || []} />
        <SelectField label="Month" value={filters.month} onChange={(e) => update("month", e.target.value)} options={monthOptions} />
        <DateField label="From Date" value={filters.fromDate} onChange={(e) => update("fromDate", e.target.value)} />
        <DateField label="To Date" value={filters.toDate} onChange={(e) => update("toDate", e.target.value)} />

        <SelectField label="Region" value={filters.region} onChange={(e) => update("region", e.target.value)} options={options.regions || []} />
        <SelectField label="Country" value={filters.country} onChange={(e) => update("country", e.target.value)} options={options.countries || []} />
        <SelectField label="Product" value={filters.product} onChange={(e) => update("product", e.target.value)} options={options.products || []} />
        <SelectField label="Category" value={filters.category} onChange={(e) => update("category", e.target.value)} options={options.categories || []} />
        <SelectField label="Status" value={filters.status} onChange={(e) => update("status", e.target.value)} options={options.statuses || []} />
      </div>
    </section>
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
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  function exportPdf() {
    const doc = new jsPDF("landscape");

    doc.text("Social Report", 14, 14);
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

    doc.save("social-report.pdf");
  }

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Social Analytics"
        subtitle="Social post and query reporting with response tracking, product, category, region, country and resolved status analytics."
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

      <SocialFilters filters={filters} setFilters={setFilters} options={options} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Queries" value={analytics.totalQueries} hint="Social records" />
        <MetricCard label="Solved" value={analytics.solved} hint="Resolved responses" />
        <MetricCard label="Unsolved" value={analytics.unsolved} hint="Open responses" />
        <MetricCard label="Countries" value={analytics.countries} hint="Known countries" />
      </section>

      <section>
        <ChartCard title="Date-wise Social Queries" showLimit={false}>
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

      <section className="grid gap-6 xl:grid-cols-2">
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

      <SocialTable rows={rows} />

      {loading ? (
        <div className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]">
          Loading Social report...
        </div>
      ) : null}
    </div>
  );
}