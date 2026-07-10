import { useEffect, useMemo, useState } from "react";

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

function DarkTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl">
      <p className="mb-2 font-black text-white">
        {label}
      </p>

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
  );
}

function WhitePieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
  percentage = false,
}) {
  if (!value) return null;

  const RADIAN = Math.PI / 180;
  const radius =
    innerRadius + (outerRadius - innerRadius) * 0.62;

  const x =
    cx + radius * Math.cos(-midAngle * RADIAN);

  const y =
    cy + radius * Math.sin(-midAngle * RADIAN);

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
      {percentage
        ? `${Number(value).toFixed(1)}%`
        : value}
    </text>
  );
}

function limitData(data = [], limit = "10") {
  if (limit === "all") return data;

  return data.slice(0, Number(limit));
}

export default function AgentPerformancePage() {
  const [filters, setFilters] =
    useState(initialFilters);

  const [report, setReport] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [syncing, setSyncing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [solvedLimit, setSolvedLimit] =
    useState("10");

  const [
    satisfactionLimit,
    setSatisfactionLimit,
  ] = useState("10");

  const [replyLimit, setReplyLimit] =
    useState("10");

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

  const [slaLimit, setSlaLimit] =
    useState("10");

  const analytics = report?.analytics || {};
  const options = report?.filters || {};
  const agentSummary = analytics.byAgent || [];

  const filterKey = useMemo(
    () => JSON.stringify(filters),
    [filters]
  );

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const data =
        await fetchAgentReport(filters);

      setReport(data);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
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
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
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
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
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
    const rows = agentSummary.map((row) => ({
      Agent: row.name,
      Assigned: row.assignedTickets,
      Solved: row.solvedTickets,
      "Resolution Rate %": row.resolutionRate,
      Good: row.goodSatisfaction,
      Bad: row.badSatisfaction,
      "Satisfaction %": row.satisfactionScore,
      "First Reply Minutes":
        row.averageFirstReplyMinutes,
      "Resolution Hours":
        row.averageResolutionHours,
      "Turnaround Hours":
        row.averageTurnaroundHours,
      "SLA Met %": row.slaCompliance,
      "SLA Breached %": row.slaBreached,
      Performance: row.performanceStatus,
    }));

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Agent Performance"
    );

    XLSX.writeFile(
      workbook,
      "agent-performance.xlsx"
    );
  }

  function exportPdf() {
    const document = new jsPDF("landscape");

    document.text(
      "Agent Performance Report",
      14,
      14
    );

    autoTable(document, {
      startY: 22,
      head: [
        [
          "Agent",
          "Assigned",
          "Solved",
          "Resolution %",
          "Satisfaction %",
          "First Reply Min",
          "Resolution Hr",
          "Turnaround Hr",
          "SLA Met %",
          "SLA Breached %",
        ],
      ],
      body: agentSummary.map((row) => [
        row.name,
        row.assignedTickets,
        row.solvedTickets,
        row.resolutionRate,
        row.satisfactionScore,
        row.averageFirstReplyMinutes,
        row.averageResolutionHours,
        row.averageTurnaroundHours,
        row.slaCompliance,
        row.slaBreached,
      ]),
      styles: {
        fontSize: 6,
      },
      headStyles: {
        fillColor: [0, 220, 197],
        textColor: [0, 0, 0],
      },
    });

    document.save(
      "agent-performance.pdf"
    );
  }

  const solvedData = limitData(
    analytics.bySolvedAgent || [],
    solvedLimit
  );

  const satisfactionData = limitData(
    analytics.bySatisfactionAgent || [],
    satisfactionLimit
  );

  const replyData = limitData(
    analytics.byFirstReplyAgent || [],
    replyLimit
  );

  const resolutionData = limitData(
    analytics.byResolutionAgent || [],
    resolutionLimit
  );

  const assignedSolvedData = limitData(
    analytics.byAssignedSolved || [],
    assignedSolvedLimit
  );

  const turnaroundData = limitData(
    analytics.byTurnaroundAgent || [],
    turnaroundLimit
  );

  const slaData = limitData(
    analytics.bySlaAgent || [],
    slaLimit
  );

  const categoryData =
    analytics.byCategory || [];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Agent Performance"
        subtitle="Agent ticket resolution, satisfaction, response time, turnaround and internal SLA analytics."
        syncedAt={report?.syncedAt}
        loading={syncing}
        onSync={handleSync}
        onUnsync={handleUnsync}
        onExcel={exportExcel}
        onPdf={exportPdf}
      />

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {error}
        </div>
      ) : null}

      <AgentFilters
        filters={filters}
        setFilters={setFilters}
        options={options}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Tickets"
          value={analytics.totalTickets || 0}
          hint="Filtered agent tickets"
        />

        <MetricCard
          label="Solved Tickets"
          value={analytics.solvedTickets || 0}
          hint="Solved or closed"
        />

        <MetricCard
          label="Resolution Rate"
          value={`${Number(
            analytics.resolutionRate || 0
          ).toFixed(1)}%`}
          hint="Solved from total"
        />

        <MetricCard
          label="Satisfaction Score"
          value={`${Number(
            analytics.satisfactionScore || 0
          ).toFixed(1)}%`}
          hint="Good from rated responses"
        />

        <MetricCard
          label="Avg. First Reply"
          value={`${Number(
            analytics.averageFirstReplyMinutes || 0
          ).toFixed(1)} min`}
          hint="Minimum bracket value"
        />

        <MetricCard
          label="Avg. Resolution"
          value={`${Number(
            analytics.averageResolutionHours || 0
          ).toFixed(1)} hr`}
          hint="Average resolution"
        />

        <MetricCard
          label="Avg. Turnaround"
          value={`${Number(
            analytics.averageTurnaroundHours || 0
          ).toFixed(1)} hr`}
          hint="Assignment to solved"
        />

        <MetricCard
          label="SLA Compliance"
          value={`${Number(
            analytics.slaCompliance || 0
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
              data={analytics.byDate || []}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
              />

              <XAxis
                dataKey="name"
                stroke="#777"
              />

              <YAxis stroke="#777" />

              <Tooltip
                content={<DarkTooltip />}
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
          limit={solvedLimit}
          onLimitChange={setSolvedLimit}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={solvedData}
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
                content={<DarkTooltip />}
              />

              <Bar
                dataKey="value"
                name="Solved Tickets"
                radius={[0, 8, 8, 0]}
              >
                {solvedData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={
                      chartColors[
                        index %
                          chartColors.length
                      ]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Agent Satisfaction Score"
          limit={satisfactionLimit}
          onLimitChange={setSatisfactionLimit}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart>
              <Pie
                data={satisfactionData}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                labelLine={false}
                label={(props) => (
                  <WhitePieLabel
                    {...props}
                    percentage
                  />
                )}
              >
                {satisfactionData.map(
                  (_, index) => (
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
          limit={assignedSolvedLimit}
          onLimitChange={
            setAssignedSolvedLimit
          }
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart data={assignedSolvedData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
              />

              <XAxis
                dataKey="name"
                stroke="#777"
              />

              <YAxis stroke="#777" />

              <Tooltip
                content={<DarkTooltip />}
              />

              <Legend />

              <Bar
                dataKey="assigned"
                name="Assigned"
                fill="#38bdf8"
              />

              <Bar
                dataKey="solved"
                name="Solved"
                fill="#00dcc5"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Estimated First Reply Time in Minutes"
          limit={replyLimit}
          onLimitChange={setReplyLimit}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={replyData}
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
                radius={[0, 8, 8, 0]}
              >
                {replyData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={
                      chartColors[
                        index %
                          chartColors.length
                      ]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Estimated Resolution Time in Hours"
          limit={resolutionLimit}
          onLimitChange={setResolutionLimit}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={resolutionData}
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
                radius={[0, 8, 8, 0]}
              >
                {resolutionData.map(
                  (_, index) => (
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
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                labelLine
                label={<WhitePieLabel />}
              >
                {categoryData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={
                      chartColors[
                        index %
                          chartColors.length
                      ]
                    }
                  />
                ))}
              </Pie>

              <Tooltip
                content={<DarkTooltip />}
              />

              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section>
        <ChartCard
          title="Agent Turnaround Time in Hours"
          limit={turnaroundLimit}
          onLimitChange={setTurnaroundLimit}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={turnaroundData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
              />

              <XAxis
                dataKey="name"
                stroke="#777"
              />

              <YAxis stroke="#777" />

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
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section>
        <ChartCard
          title="Agent SLA Compliance"
          limit={slaLimit}
          onLimitChange={setSlaLimit}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={slaData}
              layout="vertical"
              margin={{
                top: 5,
                right: 40,
                left: 80,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
              />

              <XAxis
                type="number"
                domain={[0, 100]}
                stroke="#777"
                tickFormatter={(value) =>
                  `${value}%`
                }
              />

              <YAxis
                type="category"
                dataKey="name"
                width={150}
                stroke="#777"
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
                stackId="sla"
              />

              <Bar
                dataKey="breached"
                name="SLA Breached"
                fill="#ef4444"
                stackId="sla"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <AgentReportTable rows={agentSummary} />

      {loading ? (
        <div className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]">
          Loading agent performance...
        </div>
      ) : null}
    </div>
  );
}
