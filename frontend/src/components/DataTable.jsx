export default function DataTable({ rows = [], columns = [] }) {
  return (
    <div className="dashboard-card overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <h3 className="text-lg font-black">Report Table</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Showing {rows.length} records from current filtered data.
        </p>
      </div>

      <div className="overflow-auto">
        <table className="soft-table min-w-[1300px]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${row.ticketId}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key}>{row[column.key] || "-"}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}