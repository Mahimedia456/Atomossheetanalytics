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
import html2canvas from "html2canvas";

import ChartCard from "../../../components/ChartCard";
import MetricCard from "../../../components/MetricCard";
import ReportHeader from "../../../components/ReportHeader";
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

  async function exportPdf() {
    const dashboardElement = document.getElementById(
      "social-analytics-pdf-content",
    );

    if (!dashboardElement) {
      setError(
        "Unable to locate the dashboard for PDF export.",
      );
      return;
    }

    setError("");

    const temporaryHeader =
      document.createElement("section");

    temporaryHeader.className =
      "dashboard-card p-6";

    temporaryHeader.setAttribute(
      "data-pdf-temporary-header",
      "true",
    );

    temporaryHeader.style.background =
      "#000000";

    temporaryHeader.innerHTML = `
      <div style="
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:24px;
        background:#000000;
        color:#ffffff;
      ">
        <div>
          <p style="
            margin:0;
            color:#00dcc5;
            font-size:11px;
            font-weight:900;
            letter-spacing:0.18em;
            text-transform:uppercase;
          ">
            Atomos Google Sheet Analytics
          </p>

          <h1 style="
            margin:8px 0 0;
            color:#ffffff;
            font-size:28px;
            font-weight:900;
          ">
            Social Analytics Dashboard
          </h1>

          <p style="
            margin:8px 0 0;
            color:#a1a1aa;
            font-size:13px;
          ">
            Social queries, responses, products, categories, regions and resolution status
          </p>
        </div>

        <div style="
          text-align:right;
          color:#a1a1aa;
          font-size:11px;
          line-height:1.8;
        ">
          <div>
            Records:
            <strong style="color:#ffffff;">
              ${report?.total ?? rows.length}
            </strong>
          </div>

          <div>
            Synced:
            <strong style="color:#ffffff;">
              ${
                report?.syncedAt
                  ? new Date(
                      report.syncedAt,
                    ).toLocaleString()
                  : "Not available"
              }
            </strong>
          </div>

          <div>
            Exported:
            <strong style="color:#ffffff;">
              ${new Date().toLocaleString()}
            </strong>
          </div>
        </div>
      </div>
    `;

    dashboardElement.prepend(
      temporaryHeader,
    );

    const previousScrollX =
      window.scrollX;

    const previousScrollY =
      window.scrollY;

    try {
      window.scrollTo(0, 0);

      await new Promise((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(resolve),
        ),
      );

      const overviewSections =
        Array.from(
          dashboardElement.children,
        ).filter((element) => {
          if (
            element.hasAttribute(
              "data-html2canvas-ignore",
            )
          ) {
            return false;
          }

          if (
            element.matches(
              '[data-pdf-temporary-header="true"]',
            )
          ) {
            return true;
          }

          const hasChart = Boolean(
            element.querySelector(
              ".recharts-responsive-container",
            ),
          );

          const hasCard = Boolean(
            element.matches(
              ".dashboard-card",
            ) ||
              element.querySelector(
                ".dashboard-card",
              ),
          );

          return hasCard && !hasChart;
        });

      const chartCards = Array.from(
        dashboardElement.querySelectorAll(
          ".dashboard-card",
        ),
      ).filter((card) => {
        if (
          card.closest(
            '[data-html2canvas-ignore="true"]',
          )
        ) {
          return false;
        }

        return Boolean(
          card.querySelector(
            ".recharts-responsive-container",
          ),
        );
      });

      const exportSections = [
        ...overviewSections,
        ...chartCards,
      ].filter(
        (element, index, list) =>
          list.indexOf(element) === index,
      );

      if (!exportSections.length) {
        throw new Error(
          "No dashboard sections were found for PDF export.",
        );
      }

      const pdfDocument = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth =
        pdfDocument.internal.pageSize.getWidth();

      const pageHeight =
        pdfDocument.internal.pageSize.getHeight();

      const margin = 8;
      const availableWidth =
        pageWidth - margin * 2;
      const availableHeight =
        pageHeight - margin * 2;

      for (
        let index = 0;
        index < exportSections.length;
        index += 1
      ) {
        const section =
          exportSections[index];

        const canvas = await html2canvas(
          section,
          {
            backgroundColor: "#000000",
            scale: 2,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: Math.max(
              document.documentElement.clientWidth,
              section.scrollWidth,
            ),
            windowHeight: Math.max(
              document.documentElement.clientHeight,
              section.scrollHeight,
            ),
            ignoreElements: (element) =>
              element.hasAttribute?.(
                "data-html2canvas-ignore",
              ),
          },
        );

        if (index > 0) {
          pdfDocument.addPage();
        }

        pdfDocument.setFillColor(
          0,
          0,
          0,
        );

        pdfDocument.rect(
          0,
          0,
          pageWidth,
          pageHeight,
          "F",
        );

        const scaleRatio = Math.min(
          availableWidth / canvas.width,
          availableHeight / canvas.height,
        );

        const imageWidth =
          canvas.width * scaleRatio;

        const imageHeight =
          canvas.height * scaleRatio;

        const imageX =
          (pageWidth - imageWidth) / 2;

        const imageY =
          (pageHeight - imageHeight) / 2;

        pdfDocument.addImage(
          canvas.toDataURL(
            "image/jpeg",
            0.96,
          ),
          "JPEG",
          imageX,
          imageY,
          imageWidth,
          imageHeight,
          undefined,
          "FAST",
        );
      }

      pdfDocument.save(
        `social-analytics-dashboard-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`,
      );
    } catch (pdfError) {
      setError(
        pdfError?.message ||
          "Unable to export dashboard PDF.",
      );
    } finally {
      temporaryHeader.remove();

      window.scrollTo(
        previousScrollX,
        previousScrollY,
      );
    }
  }

  return (
    <div
      id="social-analytics-pdf-content"
      className="space-y-6"
    >
      <div data-html2canvas-ignore="true">
        <ReportHeader
          title="Social Analytics"
          // subtitle="Social post and query reporting with response tracking, product, category, region, country and resolved status analytics."
          syncedAt={report?.syncedAt}
          loading={syncing}
          onSync={handleSync}
          onUnsync={() => setReport(null)}
          onExcel={exportExcel}
          onPdf={exportPdf}
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

      <div data-html2canvas-ignore="true">

        

              <SocialTable rows={rows} />

      </div>

      {loading ? (
        <div data-html2canvas-ignore="true" className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]">
          Loading Social report...
        </div>
      ) : null}
    </div>
  );
}