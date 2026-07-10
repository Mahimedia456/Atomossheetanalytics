import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import AgentFilters from "./AgentFilters";
import AgentReportTable from "./AgentReportTable";

import ChartCard from "../../../components/ChartCard";
import MetricCard from "../../../components/MetricCard";
import ReportHeader from "../../../components/ReportHeader";

import {
  fetchAgentReport,
  syncAgents,
  unsyncAgents,
} from "../../../services/agentApi";

const initialFilters = {
  search: "",
  year: "",
  month: "",
  fromDate: "",
  toDate: "",
  agent: "",
  status: "",
  rating: "",
  category: "",
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
  "#f43f5e",
  "#84cc16",
];

function formatMinutes(value) {
  const minutes = Number(value);

  if (!Number.isFinite(minutes)) {
    return "0 min";
  }

  return `${minutes.toFixed(1)} min`;
}

function formatHours(value) {
  const hours = Number(value);

  if (!Number.isFinite(hours)) {
    return "0 hr";
  }

  return `${hours.toFixed(1)} hr`;
}

function formatHoursFromMinutes(value) {
  const minutes = Number(value);

  if (!Number.isFinite(minutes)) {
    return "-";
  }

  return `${(minutes / 60).toFixed(1)} hr`;
}

function DarkTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl">
      <p className="mb-2 font-black text-white">
        {label}
      </p>

      <div className="space-y-1">
        {payload.map((item) => (
          <p
            key={`${item.dataKey}-${item.name}`}
            className="font-bold text-[#00dcc5]"
          >
            {item.name}: {item.value}
            {valueSuffix}
          </p>
        ))}
      </div>
    </div>
  );
}

function SatisfactionPieLabel({
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

  const RADIAN = Math.PI / 180;

  const radius =
    innerRadius +
    (outerRadius - innerRadius) * 0.62;

  const x =
    cx +
    radius *
      Math.cos(-midAngle * RADIAN);

  const y =
    cy +
    radius *
      Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={900}
    >
      {`${Number(value).toFixed(1)}%`}
    </text>
  );
}

function limitData(
  data = [],
  limit = "10"
) {
  if (limit === "all") {
    return data;
  }

  return data.slice(
    0,
    Number(limit)
  );
}

export default function AgentPerformancePage() {
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

  const [
    solvedLimit,
    setSolvedLimit,
  ] = useState("10");

  const [
    satisfactionLimit,
    setSatisfactionLimit,
  ] = useState("10");

  const [
    replyLimit,
    setReplyLimit,
  ] = useState("10");

  const [
    resolutionLimit,
    setResolutionLimit,
  ] = useState("10");

  const [
    assignedSolvedLimit,
    setAssignedSolvedLimit,
  ] = useState("10");

  const [
    turnaroundLimit,
    setTurnaroundLimit,
  ] = useState("10");

  const [
    slaLimit,
    setSlaLimit,
  ] = useState("10");

  const analytics =
    report?.analytics || {};

  const options =
    report?.filters || {};

  const ticketRows =
    report?.rows || [];

  const agentSummary =
    analytics.byAgent || [];

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
        await fetchAgentReport(
          filters
        );

      setReport(data);
    } catch (
      requestError
    ) {
      setError(
        requestError
          ?.response
          ?.data
          ?.message ||
          requestError
            ?.message ||
          "Failed to load agent report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError("");

    try {
      await syncAgents();
      await loadReport();
    } catch (
      requestError
    ) {
      setError(
        requestError
          ?.response
          ?.data
          ?.message ||
          requestError
            ?.message ||
          "Agent sync failed."
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleUnsync() {
    setSyncing(true);
    setError("");

    try {
      await unsyncAgents();
      setReport(null);
    } catch (
      requestError
    ) {
      setError(
        requestError
          ?.response
          ?.data
          ?.message ||
          requestError
            ?.message ||
          "Agent unsync failed."
      );
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [filterKey]);

  function exportExcel() {
    if (!ticketRows.length) {
      window.alert(
        "No agent ticket data to export."
      );

      return;
    }

    const exportRows =
      ticketRows.map(
        (row) => ({
          "Ticket ID":
            row.ticketId,

          Agent:
            row.agentName,

          "Created Date":
            row.createdDate,

          "Assigned Date":
            row.assignedDate,

          "Solved Date":
            row.solvedDate,

          Status:
            row.status,

          Category:
            row.category,

          Satisfaction:
            row.rating,

          "First Reply Per Ticket (Minutes)":
            row.firstReplyMinutes,

          "Resolution Per Ticket (Hours)":
            Number.isFinite(
              Number(
                row.firstResolutionMinutes
              )
            )
              ? Number(
                  (
                    Number(
                      row.firstResolutionMinutes
                    ) / 60
                  ).toFixed(1)
                )
              : "",

          "Turnaround Per Ticket (Hours)":
            Number.isFinite(
              Number(
                row.turnaroundMinutes
              )
            )
              ? Number(
                  (
                    Number(
                      row.turnaroundMinutes
                    ) / 60
                  ).toFixed(1)
                )
              : "",

          "First Reply Bracket":
            row.firstReplyBracket,

          "Resolution Bracket":
            row.firstResolutionBracket,

          "Satisfaction Comment":
            row.satisfactionComment,
        })
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportRows
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Agent Ticket Performance"
    );

    XLSX.writeFile(
      workbook,
      "agent-ticket-performance.xlsx"
    );
  }

  function exportPdf() {
    if (!ticketRows.length) {
      window.alert(
        "No agent ticket data to export."
      );

      return;
    }

    const document =
      new jsPDF(
        "landscape"
      );

    document.setFontSize(16);

    document.text(
      "Agent Ticket Performance Report",
      14,
      14
    );

    autoTable(document, {
      startY: 22,

      head: [
        [
          "Ticket",
          "Agent",
          "Created",
          "Assigned",
          "Solved",
          "Status",
          "Category",
          "Rating",
          "First Reply Min",
          "Resolution Hr",
          "Turnaround Hr",
        ],
      ],

      body:
        ticketRows.map(
          (row) => [
            row.ticketId ||
              "-",

            row.agentName ||
              "Unknown",

            row.createdDate ||
              "-",

            row.assignedDate ||
              "-",

            row.solvedDate ||
              "-",

            row.status ||
              "-",

            row.category ||
              "-",

            row.rating ||
              "-",

            Number.isFinite(
              Number(
                row.firstReplyMinutes
              )
            )
              ? Number(
                  row.firstReplyMinutes
                ).toFixed(1)
              : "-",

            Number.isFinite(
              Number(
                row.firstResolutionMinutes
              )
            )
              ? (
                  Number(
                    row.firstResolutionMinutes
                  ) / 60
                ).toFixed(1)
              : "-",

            Number.isFinite(
              Number(
                row.turnaroundMinutes
              )
            )
              ? (
                  Number(
                    row.turnaroundMinutes
                  ) / 60
                ).toFixed(1)
              : "-",
          ]
        ),

      styles: {
        fontSize: 6,
      },

      headStyles: {
        fillColor: [
          0,
          220,
          197,
        ],

        textColor: [
          0,
          0,
          0,
        ],
      },
    });

    document.save(
      "agent-ticket-performance.pdf"
    );
  }

  const solvedData =
    limitData(
      analytics.bySolvedAgent ||
        [],
      solvedLimit
    );

  const satisfactionData =
    limitData(
      analytics.bySatisfactionAgent ||
        [],
      satisfactionLimit
    );

  const replyData =
    limitData(
      analytics.byFirstReplyAgent ||
        [],
      replyLimit
    );

  const resolutionData =
    limitData(
      analytics.byResolutionAgent ||
        [],
      resolutionLimit
    );

  const assignedSolvedData =
    limitData(
      analytics.byAssignedSolved ||
        [],
      assignedSolvedLimit
    );

  const turnaroundData =
    limitData(
      analytics.byTurnaroundAgent ||
        [],
      turnaroundLimit
    );

  const slaData =
    limitData(
      analytics.bySlaAgent ||
        [],
      slaLimit
    );

  const categoryData =
    analytics.byCategory || [];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Agent Performance"
        subtitle="Agent ticket resolution, satisfaction, per-ticket response time, resolution time, turnaround and calculated SLA analytics."
        syncedAt={
          report?.syncedAt
        }
        loading={syncing}
        onSync={handleSync}
        onUnsync={
          handleUnsync
        }
        onExcel={
          exportExcel
        }
        onPdf={exportPdf}
      />

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {error}
        </div>
      ) : null}

      <AgentFilters
        filters={filters}
        setFilters={
          setFilters
        }
        options={options}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Tickets"
          value={
            analytics.totalTickets ||
            0
          }
          hint="Filtered agent tickets"
        />

        <MetricCard
          label="Solved Tickets"
          value={
            analytics.solvedTickets ||
            0
          }
          hint="Solved or closed"
        />

        <MetricCard
          label="Resolution Rate"
          value={`${Number(
            analytics.resolutionRate ||
              0
          ).toFixed(1)}%`}
          hint="Solved from total"
        />

        <MetricCard
          label="Satisfaction Score"
          value={`${Number(
            analytics.satisfactionScore ||
              0
          ).toFixed(1)}%`}
          hint="Good from rated responses"
        />

        <MetricCard
          label="Avg. First Reply / Ticket"
          value={formatMinutes(
            analytics.averageFirstReplyMinutes
          )}
          hint="Valid reply brackets only; No replies excluded"
        />

        <MetricCard
          label="Avg. Resolution / Ticket"
          value={formatHours(
            analytics.averageResolutionHours
          )}
          hint="Measured resolution tickets only"
        />

        <MetricCard
          label="Avg. Turnaround / Ticket"
          value={formatHours(
            analytics.averageTurnaroundHours
          )}
          hint="Tickets with assigned and solved dates only"
        />

        <MetricCard
          label="SLA Compliance"
          value={`${Number(
            analytics.slaCompliance ||
              0
          ).toFixed(1)}%`}
          hint="Measured SLA checks"
        />
      </section>

      <section>
        <ChartCard
          title="Date-wise Agent Performance"
          showLimit={false}
        >
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

              <Legend />

              <Line
                type="monotone"
                dataKey="assigned"
                name="Assigned"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="solved"
                name="Solved"
                stroke="#00dcc5"
                strokeWidth={3}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="satisfactionScore"
                name="Satisfaction %"
                stroke="#eab308"
                strokeWidth={3}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="slaCompliance"
                name="SLA Compliance %"
                stroke="#a855f7"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Agent-wise Solved Tickets"
          limit={
            solvedLimit
          }
          onLimitChange={
            setSolvedLimit
          }
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                solvedData
              }
              layout="vertical"
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
                width={140}
                stroke="#777"
              />

              <Tooltip
                content={
                  <DarkTooltip />
                }
              />

              <Bar
                dataKey="value"
                name="Solved Tickets"
                radius={[
                  0,
                  8,
                  8,
                  0,
                ]}
              >
                {solvedData.map(
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

        <ChartCard
          title="Agent Satisfaction Score"
          limit={
            satisfactionLimit
          }
          onLimitChange={
            setSatisfactionLimit
          }
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart>
              <Pie
                data={
                  satisfactionData
                }
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                labelLine={false}
                label={
                  <SatisfactionPieLabel />
                }
              >
                {satisfactionData.map(
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
                  <DarkTooltip valueSuffix="%" />
                }
              />

              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Assigned vs Solved Tickets"
          limit={
            assignedSolvedLimit
          }
          onLimitChange={
            setAssignedSolvedLimit
          }
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                assignedSolvedData
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

              <Legend />

              <Bar
                dataKey="assigned"
                name="Assigned"
                fill="#38bdf8"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />

              <Bar
                dataKey="solved"
                name="Solved"
                fill="#00dcc5"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Estimated First Reply Time in Minutes"
          limit={
            replyLimit
          }
          onLimitChange={
            setReplyLimit
          }
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                replyData
              }
              layout="vertical"
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
                width={140}
                stroke="#777"
              />

              <Tooltip
                content={
                  <DarkTooltip valueSuffix=" min" />
                }
              />

              <Bar
                dataKey="value"
                name="Minutes"
                radius={[
                  0,
                  8,
                  8,
                  0,
                ]}
              >
                {replyData.map(
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

        <ChartCard
          title="Estimated Resolution Time in Hours"
          limit={
            resolutionLimit
          }
          onLimitChange={
            setResolutionLimit
          }
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                resolutionData
              }
              layout="vertical"
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
                width={140}
                stroke="#777"
              />

              <Tooltip
                content={
                  <DarkTooltip valueSuffix=" hr" />
                }
              />

              <Bar
                dataKey="value"
                name="Hours"
                radius={[
                  0,
                  8,
                  8,
                  0,
                ]}
              >
                {resolutionData.map(
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

        <ChartCard
          title="Ticket Category Distribution"
          showLimit={false}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart
              margin={{
                top: 20,
                right: 25,
                bottom: 35,
                left: 25,
              }}
            >
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                outerRadius={112}
                labelLine={false}
                label={({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  value,
                }) => {
                  const numericValue = Number(value);

                  if (
                    !Number.isFinite(numericValue) ||
                    numericValue <= 0 ||
                    numericValue < 100
                  ) {
                    return null;
                  }

                  const RADIAN = Math.PI / 180;

                  const radius =
                    innerRadius +
                    (outerRadius - innerRadius) * 0.62;

                  const x =
                    cx +
                    radius *
                      Math.cos(-midAngle * RADIAN);

                  const y =
                    cy +
                    radius *
                      Math.sin(-midAngle * RADIAN);

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#ffffff"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={12}
                      fontWeight={900}
                    >
                      {numericValue.toLocaleString()}
                    </text>
                  );
                }}
              >
                {categoryData.map((_, index) => (
                  <Cell
                    key={`category-${index}`}
                    fill={
                      chartColors[
                        index % chartColors.length
                      ]
                    }
                    stroke="#000000"
                    strokeWidth={1}
                  />
                ))}
              </Pie>

              <Tooltip
                content={<DarkTooltip />}
              />

              <Legend
                verticalAlign="bottom"
                height={30}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section>
        <ChartCard
          title="Agent Turnaround Time in Hours"
          limit={
            turnaroundLimit
          }
          onLimitChange={
            setTurnaroundLimit
          }
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={
                turnaroundData
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
                  <DarkTooltip valueSuffix=" hr" />
                }
              />

              <Line
                type="monotone"
                dataKey="value"
                name="Turnaround Hours"
                stroke="#00dcc5"
                strokeWidth={3}
                dot={{
                  r: 3,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section>
        <ChartCard
          title="Agent SLA Compliance"
          limit={slaLimit}
          onLimitChange={
            setSlaLimit
          }
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                slaData
              }
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
                domain={[
                  0,
                  100,
                ]}
                stroke="#777"
                tickFormatter={(
                  value
                ) =>
                  `${value}%`
                }
              />

              <Tooltip
                content={
                  <DarkTooltip valueSuffix="%" />
                }
              />

              <Legend />

              <Bar
                dataKey="met"
                name="SLA Met"
                fill="#00dcc5"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />

              <Bar
                dataKey="breached"
                name="SLA Breached"
                fill="#ef4444"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <AgentReportTable
        rows={agentSummary}
      />

      {loading ? (
        <div className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]">
          Loading agent performance...
        </div>
      ) : null}
    </div>
  );
}