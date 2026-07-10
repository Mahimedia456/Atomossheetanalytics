function formatPercentage(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatMinutes(value) {
  return `${Number(value || 0).toFixed(1)} min`;
}

function formatHours(value) {
  return `${Number(value || 0).toFixed(1)} hr`;
}

export default function AgentReportTable({
  rows = [],
}) {
  return (
    <section className="dashboard-card overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
          Agent Report
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          Agent Performance Summary
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          Showing {rows.length} agents.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="soft-table min-w-[1550px]">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Assigned</th>
              <th>Solved</th>
              <th>Resolution Rate</th>
              <th>Open</th>
              <th>Pending</th>
              <th>Good</th>
              <th>Bad</th>
              <th>Satisfaction</th>
              <th>First Reply</th>
              <th>Resolution</th>
              <th>Turnaround</th>
              <th>SLA Met</th>
              <th>SLA Breached</th>
              <th>Performance</th>
            </tr>
          </thead>

          <tbody>
            {!rows.length ? (
              <tr>
                <td
                  colSpan={15}
                  className="py-12 text-center"
                >
                  No agent records found.
                </td>
              </tr>
            ) : null}

            {rows.map((row) => (
              <tr key={row.name}>
                <td className="font-black text-white">
                  {row.name}
                </td>
                <td>{row.assignedTickets}</td>
                <td>{row.solvedTickets}</td>
                <td>
                  {formatPercentage(
                    row.resolutionRate
                  )}
                </td>
                <td>{row.openTickets}</td>
                <td>{row.pendingTickets}</td>
                <td>{row.goodSatisfaction}</td>
                <td>{row.badSatisfaction}</td>
                <td>
                  {formatPercentage(
                    row.satisfactionScore
                  )}
                </td>
                <td>
                  {formatMinutes(
                    row.averageFirstReplyMinutes
                  )}
                </td>
                <td>
                  {formatHours(
                    row.averageResolutionHours
                  )}
                </td>
                <td>
                  {formatHours(
                    row.averageTurnaroundHours
                  )}
                </td>
                <td>
                  {formatPercentage(
                    row.slaCompliance
                  )}
                </td>
                <td>
                  {formatPercentage(
                    row.slaBreached
                  )}
                </td>
                <td>{row.performanceStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
