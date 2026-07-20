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
import ReportPdfLoader from "../../../components/ReportPdfLoader";

import {
  exportDashboardPdf,
  waitForPdfUiPaint,
} from "../../../utils/dashboardPdfExport";

import RushRmaFilters, {
  initialRushRmaFilters,
} from "./RushRmaFilters";

import {
  fetchGlobalRmaReport,
  syncGlobalRma,
} from "../../../services/rmaApi";

const tabs = [
  {
    key: "summary",
    label: "Summary",
  },
  {
    key: "US RMA",
    label: "US RMA",
  },
  {
    key: "EMEA RMA",
    label: "EMEA RMA",
  },
];

const columns = [
  {
    key: "region",
    label: "Region",
  },
  {
    key: "month",
    label: "Month",
  },
  {
    key: "product",
    label: "Product",
  },
  {
    key: "description",
    label: "Description",
  },
  {
    key: "actualRmaReplacement",
    label: "Actual RMA Replacement",
  },
  {
    key: "dStockUnitsReceived",
    label: "D Stock Units Received",
  },
  {
    key: "aStockSentOut",
    label: "A-Stock Sent Out",
  },
  {
    key: "rmaUnitsSentOut",
    label: "RMA Units Sent Out",
  },
  {
    key: "bStockSentOut",
    label: "B-Stock Sent Out",
  },
  {
    key: "dStock",
    label: "D - Stock",
  },
  {
    key: "bStock",
    label: "B - Stock",
  },
  {
    key: "aStock",
    label: "A - Stock",
  },
  {
    key: "pendingToShip",
    label: "Pending to Ship",
  },
  {
    key: "pendingToReceive",
    label: "Pending to Receive",
  },
  {
    key: "googleDriveRmaCases",
    label: "Total Queries",
  },
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

  const currentItem =
    payload[0];

  const displayLabel =
    label ||
    currentItem?.payload?.name ||
    currentItem?.name ||
    "Value";

  return (
    <div className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xs shadow-2xl">
      <p className="font-black text-white">
        {displayLabel}
      </p>

      <p className="mt-1 font-bold text-[#00dcc5]">
        Value:{" "}
        {Number(
          currentItem?.value ||
            0,
        ).toLocaleString()}
      </p>
    </div>
  );
}

function RmaTable({
  rows,
}) {
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
          Showing{" "}
          {rows.length.toLocaleString()}{" "}
          RMA rows.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="soft-table min-w-[1700px]">
          <thead>
            <tr>
              {columns.map(
                (column) => (
                  <th
                    key={
                      column.key
                    }
                  >
                    {
                      column.label
                    }
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {!rows.length ? (
              <tr>
                <td
                  colSpan={
                    columns.length
                  }
                  className="py-12 text-center"
                >
                  No RMA records
                  found.
                </td>
              </tr>
            ) : null}

            {rows.map(
              (
                row,
                index,
              ) => (
                <tr
                  key={`${row.region}-${row.month}-${row.product}-${index}`}
                >
                  {columns.map(
                    (
                      column,
                    ) => (
                      <td
                        key={
                          column.key
                        }
                      >
                        {row[
                          column
                            .key
                        ] ??
                          "-"}
                      </td>
                    ),
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function RushRmaPage() {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState(
      "summary",
    );

  const [
    filters,
    setFilters,
  ] =
    useState(
      initialRushRmaFilters,
    );

  const [
    report,
    setReport,
  ] =
    useState(
      null,
    );

  const [
    syncing,
    setSyncing,
  ] =
    useState(
      false,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState(
      "",
    );

  const [
    pdfExporting,
    setPdfExporting,
  ] =
    useState(
      false,
    );

  const [
    pdfProgress,
    setPdfProgress,
  ] =
    useState(
      0,
    );

  const [
    pdfMessage,
    setPdfMessage,
  ] =
    useState(
      "",
    );

  const filterKey =
    useMemo(
      () =>
        JSON.stringify(
          filters,
        ),
      [filters],
    );

  const effectiveFilters =
    useMemo(
      () => {
        if (
          activeTab ===
          "summary"
        ) {
          return filters;
        }

        return {
          ...filters,
          region:
            activeTab,
        };
      },
      [
        filters,
        activeTab,
      ],
    );

  const analytics =
    report?.analytics ||
    {};

  const rows =
    report?.rows ||
    [];

  const options =
    report?.filters ||
    {};

  async function loadReport() {
    setLoading(
      true,
    );

    setError(
      "",
    );

    try {
      const data =
        await fetchGlobalRmaReport(
          {
            ...effectiveFilters,

            fromDate:
              effectiveFilters.fromDate ||
              "",

            toDate:
              effectiveFilters.toDate ||
              "",

            dateFrom:
              effectiveFilters.fromDate ||
              "",

            dateTo:
              effectiveFilters.toDate ||
              "",

            limit:
              5000,
          },
        );

      setReport(
        data,
      );
    } catch (err) {
      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Failed to load Global RMA report.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  async function handleSync() {
    if (
      syncing
    ) {
      return;
    }

    setSyncing(
      true,
    );

    setError(
      "",
    );

    try {
      await syncGlobalRma();

      await loadReport();
    } catch (err) {
      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Global RMA sync failed.",
      );
    } finally {
      setSyncing(
        false,
      );
    }
  }

  useEffect(
    () => {
      loadReport();
    },
    [
      filterKey,
      activeTab,
    ],
  );

  function exportExcel() {
    if (
      !rows.length
    ) {
      window.alert(
        "No RMA rows to export.",
      );

      return;
    }

    const exportRows =
      rows.map(
        (row) => {
          const item =
            {};

          columns.forEach(
            (
              column,
            ) => {
              item[
                column.label
              ] =
                row[
                  column.key
                ] ??
                "";
            },
          );

          return item;
        },
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportRows,
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Global RMA",
    );

    XLSX.writeFile(
      workbook,
      "global-rma-report.xlsx",
    );
  }

  async function exportPdf() {
    if (
      pdfExporting
    ) {
      return;
    }

    setError(
      "",
    );

    setPdfExporting(
      true,
    );

    setPdfProgress(
      1,
    );

    setPdfMessage(
      "Preparing Rush RMA inventory, movement charts and report table...",
    );

    await waitForPdfUiPaint();

    try {
      await exportDashboardPdf(
        {
          rootId:
            "rush-rma-pdf-content",

          title:
            "RUSH RMA",

          filename:
            "rush-rma-dashboard",

          onProgress: ({
            progress,
            message,
          }) => {
            setPdfProgress(
              Math.min(
                99,
                Math.max(
                  1,
                  Number(
                    progress,
                  ) ||
                    1,
                ),
              ),
            );

            setPdfMessage(
              message,
            );
          },
        },
      );

      setPdfProgress(
        100,
      );

      setPdfMessage(
        "Rush RMA PDF is ready. Download started.",
      );

      await new Promise(
        (
          resolve,
        ) => {
          window.setTimeout(
            resolve,
            1400,
          );
        },
      );
    } catch (
      pdfError
    ) {
      setError(
        pdfError?.message ||
          "Unable to export Rush RMA PDF.",
      );
    } finally {
      setPdfExporting(
        false,
      );

      setPdfProgress(
        0,
      );

      setPdfMessage(
        "",
      );
    }
  }

  return (
    <>
      <ReportPdfLoader
        open={
          pdfExporting
        }
        reportName="Rush RMA"
        progress={
          pdfProgress
        }
        message={
          pdfMessage
        }
      />

      <div
        id="rush-rma-pdf-content"
        className="space-y-6"
      >
        <div data-pdf-skip="true">
          <ReportHeader
            title="RUSH RMA"
            syncedAt={
              report?.syncedAt
            }
            onSync={
              handleSync
            }
            syncing={
              syncing
            }
            onExcel={
              exportExcel
            }
            onPdf={
              exportPdf
            }
            exportingPdf={
              pdfExporting
            }
          />
        </div>

        {error ? (
          <div
            data-html2canvas-ignore="true"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200"
          >
            {error}
          </div>
        ) : null}

        <section
          data-pdf-section="true"
          data-pdf-keep-together="true"
          className="dashboard-card p-4"
        >
          <div className="flex flex-wrap gap-2">
            {tabs.map(
              (tab) => (
                <button
                  key={
                    tab.key
                  }
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab.key,
                    )
                  }
                  className={[
                    "rounded-full px-5 py-2 text-sm font-black transition",

                    activeTab ===
                    tab.key
                      ? "bg-[#00dcc5] text-black"
                      : "border border-zinc-800 bg-black text-zinc-400 hover:border-[#00dcc5] hover:text-white",
                  ].join(
                    " ",
                  )}
                >
                  {
                    tab.label
                  }
                </button>
              ),
            )}
          </div>
        </section>

        <div data-html2canvas-ignore="true">
          <RushRmaFilters
            filters={
              filters
            }
            setFilters={
              setFilters
            }
            options={
              options
            }
          />
        </div>

        <section
          data-pdf-section="true"
          data-pdf-keep-together="true"
          data-pdf-grid="4"
          className="grid gap-4 md:grid-cols-1 xl:grid-cols-5"
        >
          <MetricCard
            label="Actual RMA Replacement"
            value={
              analytics.actualRmaReplacement ||
              0
            }
            hint="Total replacements"
          />

          <MetricCard
            label="D Stock Units Received"
            value={
              analytics.dStockUnitsReceived ||
              0
            }
            hint="Total D Stock received"
          />

          <MetricCard
            label="Total Queries"
            value={
              analytics.googleDriveRmaCases ||
              0
            }
            hint="RMA case count"
          />

          <MetricCard
            label="Pending to Ship"
            value={
              analytics.pendingToShip ||
              0
            }
            hint="Open shipping"
          />

          <MetricCard
            label="Pending to Receive"
            value={
              analytics.pendingToReceive ||
              0
            }
            hint="Open receiving"
          />
        </section>

        <section
          data-pdf-section="true"
          data-pdf-keep-together="true"
          data-pdf-grid="2"
          className="grid gap-6 xl:grid-cols-2"
        >
          <ChartCard title="Month-wise Actual RMA">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  analytics.byMonth ||
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

                <Bar dataKey="value">
                  {(
                    analytics.byMonth ||
                    []
                  ).map(
                    (
                      _,
                      index,
                    ) => (
                      <Cell
                        key={
                          index
                        }
                        fill={
                          chartColors[
                            index %
                              chartColors.length
                          ]
                        }
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Product-wise Actual RMA">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={(
                  analytics.byProduct ||
                  []
                ).slice(
                  0,
                  25,
                )}
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

                <Bar dataKey="value">
                  {(
                    analytics.byProduct ||
                    []
                  )
                    .slice(
                      0,
                      25,
                    )
                    .map(
                      (
                        _,
                        index,
                      ) => (
                        <Cell
                          key={
                            index
                          }
                          fill={
                            chartColors[
                              index %
                                chartColors.length
                            ]
                          }
                        />
                      ),
                    )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sent Out Summary: left side */}
          <ChartCard title="Sent Out Summary">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  analytics.sentOutSummary ||
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
                  interval={
                    0
                  }
                  tick={{
                    fontSize:
                      10,
                  }}
                />

                <YAxis
                  stroke="#777"
                />

                <Tooltip
                  content={
                    <DarkTooltip />
                  }
                />

                <Bar dataKey="value">
                  {(
                    analytics.sentOutSummary ||
                    []
                  ).map(
                    (
                      _,
                      index,
                    ) => (
                      <Cell
                        key={
                          index
                        }
                        fill={
                          chartColors[
                            index %
                              chartColors.length
                          ]
                        }
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* New D Stock Received: right side */}
          <ChartCard title="D Stock Received">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  analytics.dStockReceivedSummary ||
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

                <Bar dataKey="value">
                  {(
                    analytics.dStockReceivedSummary ||
                    []
                  ).map(
                    (
                      _,
                      index,
                    ) => (
                      <Cell
                        key={
                          index
                        }
                        fill={
                          chartColors[
                            index %
                              chartColors.length
                          ]
                        }
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Pending Summary">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  analytics.pendingSummary ||
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

                <Bar dataKey="value">
                  {(
                    analytics.pendingSummary ||
                    []
                  ).map(
                    (
                      _,
                      index,
                    ) => (
                      <Cell
                        key={
                          index
                        }
                        fill={
                          chartColors[
                            index %
                              chartColors.length
                          ]
                        }
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {activeTab ===
          "summary" ? (
            <ChartCard title="Region-wise RMA">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={
                      analytics.byRegion ||
                      []
                    }
                    dataKey="value"
                    nameKey="name"
                    outerRadius={
                      105
                    }
                    label
                  >
                    {(
                      analytics.byRegion ||
                      []
                    ).map(
                      (
                        _,
                        index,
                      ) => (
                        <Cell
                          key={
                            index
                          }
                          fill={
                            chartColors[
                              index %
                                chartColors.length
                            ]
                          }
                        />
                      ),
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
          ) : null}

          {/*
           * Stock Received Summary is deliberately
           * rendered last in the charts section.
           */}
          <ChartCard title="Stock Received Summary">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={
                    analytics.stockSummary ||
                    []
                  }
                  dataKey="value"
                  nameKey="name"
                  outerRadius={
                    105
                  }
                  label
                >
                  {(
                    analytics.stockSummary ||
                    []
                  ).map(
                    (
                      _,
                      index,
                    ) => (
                      <Cell
                        key={
                          index
                        }
                        fill={
                          chartColors[
                            index %
                              chartColors.length
                          ]
                        }
                      />
                    ),
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
        </section>

        <div
          data-pdf-section="true"
          data-pdf-table="true"
        >
          <RmaTable
            rows={
              rows
            }
          />
        </div>

        {loading ? (
          <div
            data-html2canvas-ignore="true"
            className="fixed bottom-5 right-5 rounded-full border border-[#00dcc5]/30 bg-black px-4 py-2 text-xs font-black text-[#00dcc5]"
          >
            Loading RMA...
          </div>
        ) : null}
      </div>
    </>
  );
}