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
import html2canvas from "html2canvas";

import ChartCard from "../../../components/ChartCard";
import MetricCard from "../../../components/MetricCard";
import ReportHeader from "../../../components/ReportHeader";
import RushRmaFilters, { initialRushRmaFilters } from "./RushRmaFilters";
import {
  fetchGlobalRmaReport,
  syncGlobalRma,
} from "../../../services/rmaApi";

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
    <div
      className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl"
    >
      <p className="font-black text-white">{label || payload[0]?.name}</p>
      <p className="mt-1 font-bold text-[#00dcc5]">
        Value: {payload[0]?.value ?? 0}
      </p>
    </div>
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
  const [filters, setFilters] = useState(initialRushRmaFilters);
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

  async function exportPdf() {
    const dashboardElement = document.getElementById(
      "rush-rma-pdf-content",
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
            Rush RMA Dashboard
          </h1>

          <p style="
            margin:8px 0 0;
            color:#a1a1aa;
            font-size:13px;
          ">
            US RMA and EMEA RMA stock movement and case analytics
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
        `rush-rma-dashboard-${new Date()
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
      id="rush-rma-pdf-content"
      className="space-y-6"
    >
      <div data-html2canvas-ignore="true">
        <ReportHeader
          title="RUSH RMA"
          // subtitle="US RMA and EMEA RMA analytics with product, month, stock movement, pending status and Google Drive RMA case tracking."
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

      <section data-html2canvas-ignore="true" className="dashboard-card p-4">
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

      <div data-html2canvas-ignore="true">

        

              <RushRmaFilters
          filters={filters}
          setFilters={setFilters}
          options={options}
        />

      </div>

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

      <div data-html2canvas-ignore="true">

        

              <RmaTable rows={rows} />

      </div>

      {loading ? (
        <div data-html2canvas-ignore="true" className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]">
          Loading Global RMA...
        </div>
      ) : null}
    </div>
  );
}