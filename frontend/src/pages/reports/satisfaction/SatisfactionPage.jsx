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
import { exportDashboardPdf } from "../../../utils/dashboardPdfExport";

import SatisfactionFilters from "./SatisfactionFilters";
import SatisfactionReportTable from "./SatisfactionReportTable";

import {
  fetchSatisfactionReport,
  syncSatisfaction,
} from "../../../services/satisfactionApi";

const initialFilters = {
  search: "",
  year: "",
  month: "",
  fromDate: "",
  toDate: "",
  category: "",
  rating: "",
  commentStatus: "",
};

const chartColors = [
  "#00dcc5",
  "#22c55e",
  "#38bdf8",
  "#eab308",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#84cc16",
];

function DarkTooltip({
  active,
  payload,
  label,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  const item =
    payload[0];

  const name =
    label ||
    item?.payload?.name ||
    item?.name ||
    "";

  const value =
    item?.value ?? 0;

  return (
    <div
      id="satisfaction-pdf-content"
      className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl"
    >
      <p className="font-black text-white">
        {name}
      </p>

      <p className="mt-1 font-bold text-[#00dcc5]">
        Responses: {value}
      </p>
    </div>
  );
}

function WhitePieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
}) {
  if (!value) {
    return null;
  }

  const RADIAN =
    Math.PI / 180;

  const radius =
    innerRadius +
    (outerRadius -
      innerRadius) *
      0.55;

  const x =
    cx +
    radius *
      Math.cos(
        -midAngle * RADIAN
      );

  const y =
    cy +
    radius *
      Math.sin(
        -midAngle * RADIAN
      );

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor={
        x > cx
          ? "start"
          : "end"
      }
      dominantBaseline="central"
      fontSize={12}
      fontWeight={900}
    >
      {value}
    </text>
  );
}

export default function SatisfactionPage() {
  const [
    filters,
    setFilters,
  ] = useState(
    initialFilters
  );

  const [
    report,
    setReport,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    syncing,
    setSyncing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const analytics =
    report?.analytics || {};

  const rows =
    report?.rows || [];

  const options =
    report?.filters || {};

  const filterKey =
    useMemo(
      () =>
        JSON.stringify(
          filters
        ),
      [filters]
    );

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const data =
        await fetchSatisfactionReport({
          ...filters,
          limit: 5000,
        });

      setReport(data);
    } catch (err) {
      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Failed to load satisfaction report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError("");

    try {
      await syncSatisfaction();

      await loadReport();
    } catch (err) {
      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Satisfaction sync failed."
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
      window.alert(
        "No satisfaction records to export."
      );

      return;
    }

    const exportRows =
      rows.map((row) => ({
        "Ticket ID":
          row.ticketId || "",

        Category:
          row.category || "",

        Date:
          row.date || "",

        Comments:
          row.comments ||
          row.comment ||
          "",

        Rating:
          row.rating || "",
      }));

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportRows
      );

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
      { wch: 80 },
      { wch: 16 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Satisfaction Analytics"
    );

    XLSX.writeFile(
      workbook,
      "satisfaction-analytics.xlsx"
    );
  }

  async function exportPdf() {
    setError("");

    try {
      await exportDashboardPdf({
        rootId: "satisfaction-pdf-content",
        title: "Satisfaction Analytics Dashboard",
        subtitle:
          "Customer satisfaction, rating, category and comment analytics",
        filename: "satisfaction-analytics-dashboard",
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

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div data-html2canvas-ignore="true">
        <ReportHeader
          title="Satisfaction Analytics"
          // subtitle="Google Sheet customer satisfaction analytics with date-wise, category-wise, rating and comment reporting."
          syncedAt={
            report?.syncedAt
          }
          loading={syncing}
          onSync={handleSync}
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

        

              <SatisfactionFilters

                filters={filters}

                setFilters={setFilters}

                options={options}

              />

      </div>

      <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-5 [&>*]:min-w-0">
        <MetricCard
          label="Total Responses"
          value={
            analytics.totalResponses
          }
          hint="Filtered satisfaction"
        />

        <MetricCard
          label="Good"
          value={
            analytics.goodResponses
          }
          hint="Good satisfaction"
        />

        <MetricCard
          label="Bad"
          value={
            analytics.badResponses
          }
          hint="Bad satisfaction"
        />

        <MetricCard
          label="With Comment"
          value={
            analytics.withComment
          }
          hint="Written feedback"
        />

        <MetricCard
          label="Without Comment"
          value={
            analytics.withoutComment
          }
          hint="Rating only"
        />
      </section>

      <section>
        <ChartCard title="Date-wise Satisfaction">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={
                analytics.byDate ||
                []
              }
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
              />

              <Tooltip
                content={
                  <DarkTooltip />
                }
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke="#00dcc5"
                strokeWidth={3}
                dot={{
                  r: 3,
                  fill: "#00dcc5",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <ChartCard title="Category-wise Satisfaction">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                analytics.byCategory ||
                []
              }
              layout="vertical"
              margin={{
                top: 5,
                right: 30,
                left: 45,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
              />

              <XAxis
                type="number"
                stroke="#777"
              />

              <YAxis
                type="category"
                dataKey="name"
                width={120}
                stroke="#777"
                tick={{
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={
                  <DarkTooltip />
                }
              />

              <Bar
                dataKey="value"
                radius={[
                  0,
                  8,
                  8,
                  0,
                ]}
              >
                {(
                  analytics.byCategory ||
                  []
                ).map(
                  (
                    _,
                    index
                  ) => (
                    <Cell
                      key={index}
                      fill={
                        chartColors[
                          index %
                            chartColors.length
                        ]
                      }
                    />
                  )
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Good vs Bad Satisfaction">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart>
              <Pie
                data={
                  analytics.byRating ||
                  []
                }
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                labelLine={false}
                label={
                  <WhitePieLabel />
                }
              >
                {(
                  analytics.byRating ||
                  []
                ).map(
                  (
                    _,
                    index
                  ) => (
                    <Cell
                      key={index}
                      fill={
                        chartColors[
                          index %
                            chartColors.length
                        ]
                      }
                    />
                  )
                )}
              </Pie>

              <Tooltip
                content={
                  <DarkTooltip />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="With Comment vs Without Comment">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart>
              <Pie
                data={
                  analytics.byCommentStatus ||
                  []
                }
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                labelLine={false}
                label={
                  <WhitePieLabel />
                }
              >
                {(
                  analytics.byCommentStatus ||
                  []
                ).map(
                  (
                    _,
                    index
                  ) => (
                    <Cell
                      key={index}
                      fill={
                        chartColors[
                          index %
                            chartColors.length
                        ]
                      }
                    />
                  )
                )}
              </Pie>

              <Tooltip
                content={
                  <DarkTooltip />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Good / Bad Comment Analysis">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                analytics.byGoodBadComment ||
                []
              }
              layout="vertical"
              margin={{
                top: 5,
                right: 30,
                left: 55,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
              />

              <XAxis
                type="number"
                stroke="#777"
              />

              <YAxis
                type="category"
                dataKey="name"
                width={150}
                stroke="#777"
                tick={{
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={
                  <DarkTooltip />
                }
              />

              <Bar
                dataKey="value"
                radius={[
                  0,
                  8,
                  8,
                  0,
                ]}
              >
                {(
                  analytics.byGoodBadComment ||
                  []
                ).map(
                  (
                    _,
                    index
                  ) => (
                    <Cell
                      key={index}
                      fill={
                        chartColors[
                          index %
                            chartColors.length
                        ]
                      }
                    />
                  )
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <div data-html2canvas-ignore="true">

        

              <SatisfactionReportTable

                title="Customer Satisfaction Report Data"

                rows={rows}

              />

      </div>

      {loading ? (
        <div data-html2canvas-ignore="true" className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]">
          Loading satisfaction report...
        </div>
      ) : null}
    </div>
  );
}