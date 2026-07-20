import { useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Frown,
  Loader2,
  RefreshCw,
  Smile,
  Sparkles,
  X,
} from "lucide-react";

import {
  analyzeSatisfactionResponse,
} from "../../../services/aiSatisfactionApi";

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeRating(value) {
  const rating = cleanText(value).toLowerCase();

  if (
    [
      "good",
      "positive",
      "satisfied",
      "very satisfied",
      "excellent",
      "4",
      "5",
    ].includes(rating)
  ) {
    return "Good";
  }

  if (
    [
      "bad",
      "negative",
      "dissatisfied",
      "unsatisfied",
      "poor",
      "1",
      "2",
    ].includes(rating)
  ) {
    return "Bad";
  }

  if (rating === "offered") {
    return "Offered";
  }

  return cleanText(value) || "Unknown";
}

function getTicketId(row) {
  return (
    row.ticketId ||
    row.ticket_id ||
    row.ticketNumber ||
    row.ticket_number ||
    "-"
  );
}

function getComment(row) {
  return (
    row.comments ||
    row.comment ||
    row.feedback ||
    ""
  );
}

function getCategory(row) {
  return (
    row.category ||
    row.Category ||
    ""
  );
}

function getDate(row) {
  return (
    row.date ||
    row.date_display ||
    row.updatedDate ||
    row.updated_date ||
    "-"
  );
}

function getDateTimestamp(row) {
  const rawDate = getDate(row);

  if (
    !rawDate ||
    rawDate === "-"
  ) {
    return 0;
  }

  /*
   * ISO and other browser-supported date formats.
   */
  const directDate =
    new Date(rawDate);

  if (
    !Number.isNaN(
      directDate.getTime(),
    )
  ) {
    return directDate.getTime();
  }

  /*
   * DD/MM/YYYY and DD-MM-YYYY.
   */
  const numericMatch =
    String(rawDate).match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/,
    );

  if (numericMatch) {
    const day =
      Number(numericMatch[1]);

    const month =
      Number(numericMatch[2]) - 1;

    let year =
      Number(numericMatch[3]);

    if (year < 100) {
      year += 2000;
    }

    const parsedDate =
      new Date(
        year,
        month,
        day,
      );

    if (
      !Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      return parsedDate.getTime();
    }
  }

  return 0;
}

function getTeamBadgeClass(team) {
  if (
    team === "Support Team"
  ) {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (
    team === "Backend Team"
  ) {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  if (
    team === "RMA Team"
  ) {
    return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  }

  if (
    team ===
    "Product / Hardware Team"
  ) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (
    team === "Customer Feedback"
  ) {
    return "border-lime-500/30 bg-lime-500/10 text-lime-300";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

function getSentimentClass(
  sentiment,
) {
  if (
    sentiment === "Positive"
  ) {
    return "border-lime-500/30 bg-lime-500/10 text-lime-300";
  }

  if (
    sentiment === "Negative"
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (
    sentiment === "Mixed"
  ) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

function RatingFilterButton({
  active,
  label,
  count,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-black transition",
        active
          ? "border-[#00dcc5] bg-[#00dcc5] text-black"
          : "border-zinc-800 bg-black text-zinc-400 hover:border-[#00dcc5] hover:text-white",
      ].join(" ")}
    >
      <span>{label}</span>

      <span
        className={[
          "rounded-full px-2 py-0.5 text-[10px]",
          active
            ? "bg-black/15 text-black"
            : "bg-zinc-900 text-zinc-500",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function AiAnalysisModal({
  row,
  onClose,
}) {
  const [
    analysis,
    setAnalysis,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const ticketId =
    getTicketId(row);

  const rating =
    normalizeRating(row.rating);

  const category =
    getCategory(row);

  const comment =
    getComment(row);

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const result =
        await analyzeSatisfactionResponse({
          ticketId,
          rating,
          category,
          comment,
        });

      setAnalysis(result);
    } catch (analysisError) {
      setError(
        analysisError?.response?.data
          ?.message ||
          analysisError?.message ||
          "Unable to analyze this satisfaction response.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runAnalysis();
  }, [row]);

  useEffect(() => {
    function handleEscape(event) {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );

      document.body.style.overflow =
        "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close AI analysis"
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
      />

      <section className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-zinc-800 bg-black shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-zinc-800 bg-black/95 p-5 backdrop-blur lg:p-7">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00dcc5] text-black">
              <BrainCircuit size={23} />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
                AI Satisfaction Analysis
              </p>

              <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.04em] text-white">
                Ticket {ticketId}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Satisfaction comment analyzed by Mahimedia AI System.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition hover:border-[#00dcc5] hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-6 p-5 lg:p-7">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-[#050505] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                Rating
              </p>

              <p className="mt-2 font-black text-white">
                {rating}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#050505] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                Category
              </p>

              <p className="mt-2 font-black text-white">
                {category || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#050505] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                Date
              </p>

              <p className="mt-2 font-black text-white">
                {getDate(row)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-[#050505] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
              Customer Comment
            </p>

            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
              {comment ||
                "No comment provided."}
            </p>
          </section>

          {loading ? (
            <section className="flex min-h-[250px] items-center justify-center rounded-[24px] border border-[#00dcc5]/30 bg-[#00dcc5]/5 p-8">
              <div className="text-center text-[#00dcc5]">
                <Loader2
                  size={36}
                  className="mx-auto animate-spin"
                />

                <p className="mt-4 font-black">
                  Mahimedia System analyzing the response
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Evaluating team ownership, sentiment and recommended action.
                </p>
              </div>
            </section>
          ) : null}

          {!loading && error ? (
            <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-5 text-red-300">
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={20}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="font-black">
                    AI analysis failed
                  </p>

                  <p className="mt-1 text-sm leading-6">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={runAnalysis}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </section>
          ) : null}

          {!loading && analysis ? (
            <section className="space-y-5 rounded-[26px] border border-zinc-800 bg-[#050505] p-5 lg:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={[
                    "inline-flex rounded-full border px-3 py-2 text-xs font-black",
                    getTeamBadgeClass(
                      analysis.team,
                    ),
                  ].join(" ")}
                >
                  {analysis.team}
                </span>

                <span
                  className={[
                    "inline-flex rounded-full border px-3 py-2 text-xs font-black",
                    getSentimentClass(
                      analysis.sentiment,
                    ),
                  ].join(" ")}
                >
                  {analysis.sentiment}
                </span>

                <span className="inline-flex rounded-full border border-zinc-800 bg-black px-3 py-2 text-xs font-black text-zinc-400">
                  Confidence:{" "}
                  {Math.round(
                    Number(
                      analysis.confidence ||
                        0,
                    ) * 100,
                  )}
                  %
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={17}
                    className="text-[#00dcc5]"
                  />

                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    AI Summary
                  </p>
                </div>

                <p className="mt-3 text-base font-bold leading-7 text-white">
                  {analysis.summary}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Classification Explanation
                  </p>

                  <p className="mt-3 text-sm leading-7 text-zinc-300">
                    {analysis.explanation}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Recommended Action
                  </p>

                  <p className="mt-3 text-sm leading-7 text-zinc-300">
                    {
                      analysis.recommendedAction
                    }
                  </p>
                </div>
              </div>

              {analysis.evidence?.length ? (
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Evidence Used
                  </p>

                  <div className="mt-3 space-y-2">
                    {analysis.evidence.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={`${item}-${index}`}
                          className="flex items-start gap-2 text-sm leading-6 text-zinc-300"
                        >
                          <CheckCircle2
                            size={16}
                            className="mt-1 shrink-0 text-[#00dcc5]"
                          />

                          <span>
                            {item}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default function SatisfactionReportTable({
  title =
    "Customer Satisfaction Data",

  rows = [],
}) {
  const [
    ratingFilter,
    setRatingFilter,
  ] = useState("All");

  const [
    selectedRow,
    setSelectedRow,
  ] = useState(null);

  const normalizedRows =
    useMemo(() => {
      return (
        Array.isArray(rows)
          ? rows
          : []
      )
        .map((row) => ({
          ...row,

          normalizedRating:
            normalizeRating(
              row.rating,
            ),

          updatedDateTimestamp:
            getDateTimestamp(row),
        }))
        .sort(
          (
            firstRow,
            secondRow,
          ) =>
            secondRow.updatedDateTimestamp -
            firstRow.updatedDateTimestamp,
        );
    }, [rows]);

  const counts =
    useMemo(() => {
      return normalizedRows.reduce(
        (
          result,
          row,
        ) => {
          result.All += 1;

          result[
            row.normalizedRating
          ] =
            (result[
              row.normalizedRating
            ] || 0) + 1;

          return result;
        },
        {
          All: 0,
          Good: 0,
          Bad: 0,
          Unknown: 0,
          Offered: 0,
        },
      );
    }, [normalizedRows]);

  const visibleRows =
    useMemo(() => {
      if (
        ratingFilter === "All"
      ) {
        return normalizedRows;
      }

      return normalizedRows.filter(
        (row) =>
          row.normalizedRating ===
          ratingFilter,
      );
    }, [
      normalizedRows,
      ratingFilter,
    ]);

  return (
    <>
      <section className="dashboard-card min-w-0 max-w-full overflow-hidden p-0">
        <div className="border-b border-zinc-800 p-5 lg:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
                Satisfaction Data
              </p>

              <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.04em] text-white">
                {title}
              </h2>

              <p className="mt-2 break-words text-sm leading-6 text-zinc-500">
                Showing{" "}
                {visibleRows.length}{" "}
                from{" "}
                {normalizedRows.length}{" "}
                satisfaction records. Latest responses are shown first.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <RatingFilterButton
                label="All"
                count={counts.All}
                active={
                  ratingFilter ===
                  "All"
                }
                onClick={() =>
                  setRatingFilter(
                    "All",
                  )
                }
              />

              <RatingFilterButton
                label="Good"
                count={counts.Good}
                active={
                  ratingFilter ===
                  "Good"
                }
                onClick={() =>
                  setRatingFilter(
                    "Good",
                  )
                }
              />

              <RatingFilterButton
                label="Bad"
                count={counts.Bad}
                active={
                  ratingFilter ===
                  "Bad"
                }
                onClick={() =>
                  setRatingFilter(
                    "Bad",
                  )
                }
              />

              {counts.Offered > 0 ? (
                <RatingFilterButton
                  label="Offered"
                  count={
                    counts.Offered
                  }
                  active={
                    ratingFilter ===
                    "Offered"
                  }
                  onClick={() =>
                    setRatingFilter(
                      "Offered",
                    )
                  }
                />
              ) : null}

              {counts.Unknown > 0 ? (
                <RatingFilterButton
                  label="Unknown"
                  count={
                    counts.Unknown
                  }
                  active={
                    ratingFilter ===
                    "Unknown"
                  }
                  onClick={() =>
                    setRatingFilter(
                      "Unknown",
                    )
                  }
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-w-0 max-w-full overflow-hidden">
          <table className="soft-table w-full table-fixed">
            <thead>
              <tr>
                <th className="w-[11%]">
                  Ticket ID
                </th>

                <th className="w-[13%]">
                  Category
                </th>

                <th className="w-[11%]">
                  Date
                </th>

                <th className="w-[12%]">
                  Rating
                </th>

                <th className="w-[38%]">
                  Comments
                </th>

                <th className="w-[15%]">
                  AI Summary
                </th>
              </tr>
            </thead>

            <tbody>
              {!visibleRows.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center"
                  >
                    No matching satisfaction records found.
                  </td>
                </tr>
              ) : null}

              {visibleRows.map(
                (
                  row,
                  index,
                ) => {
                  const rating =
                    row.normalizedRating;

                  const comment =
                    getComment(row);

                  return (
                    <tr
                      key={`${getTicketId(
                        row,
                      )}-${
                        row.id ||
                        index
                      }`}
                    >
                      <td className="break-words font-black text-white">
                        {getTicketId(row)}
                      </td>

                      <td className="break-words">
                        {getCategory(
                          row,
                        ) || "-"}
                      </td>

                      <td className="break-words font-bold text-zinc-300">
                        {getDate(row)}
                      </td>

                      <td>
                        <span
                          className={[
                            "inline-flex min-w-[112px] items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-black shadow-sm",

                            rating ===
                            "Good"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : rating ===
                                  "Bad"
                                ? "border-red-500/30 bg-red-500/10 text-red-400"
                                : "border-zinc-700 bg-zinc-800/70 text-zinc-400",
                          ].join(" ")}
                        >
                          {rating ===
                          "Good" ? (
                            <Smile
                              size={17}
                              strokeWidth={
                                2.4
                              }
                              className="shrink-0"
                            />
                          ) : rating ===
                            "Bad" ? (
                            <Frown
                              size={17}
                              strokeWidth={
                                2.4
                              }
                              className="shrink-0"
                            />
                          ) : null}

                          <span>
                            {rating}
                          </span>
                        </span>
                      </td>

                      <td>
                        <span className="line-clamp-4 block whitespace-normal break-words leading-6">
                          {comment ||
                            "-"}
                        </span>
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRow(
                              row,
                            )
                          }
                          disabled={
                            !comment
                          }
                          className="inline-flex max-w-full items-center justify-center gap-2 whitespace-normal rounded-xl bg-[#00dcc5] px-3 py-2.5 text-center text-xs font-black leading-4 text-black transition hover:shadow-[0_0_18px_rgba(0,220,197,0.35)] disabled:cursor-not-allowed disabled:bg-zinc-900 disabled:text-zinc-600"
                        >
                          <BrainCircuit
                            size={16}
                          />

                          View Summary
                        </button>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedRow ? (
        <AiAnalysisModal
          row={selectedRow}
          onClose={() =>
            setSelectedRow(null)
          }
        />
      ) : null}
    </>
  );
}