import { readSheetRows } from "./googleSheetService.js";

const ALLOWED_CATEGORIES = ["Bug", "Feature Request", "Query", "RMA"];

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeDate(value) {
  const raw = clean(value);
  if (!raw) return "";

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const slash = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (slash) {
    let first = Number(slash[1]);
    let second = Number(slash[2]);
    let year = Number(slash[3]);

    if (year < 100) year += 2000;

    let month = first;
    let day = second;

    if (first > 12) {
      day = first;
      month = second;
    }

    return [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  }

  return raw;
}

function yearFromDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.getFullYear();
}

function monthFromDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.getMonth() + 1;
}

function getValue(row, keys = []) {
  for (const key of keys) {
    if (row[key] !== undefined && clean(row[key])) return row[key];
  }

  return "";
}

function normalizeRating(value) {
  const text = clean(value).toLowerCase();

  if (["good", "positive", "satisfied", "excellent", "5", "4"].includes(text)) {
    return "Good";
  }

  if (["bad", "negative", "dissatisfied", "poor", "1", "2"].includes(text)) {
    return "Bad";
  }

  if (text === "offered") return "Offered";

  return clean(value) || "Unknown";
}

function normalizeCategory(value) {
  const text = clean(value).toLowerCase();

  if (text === "bug") return "Bug";
  if (text === "feature request" || text === "feature") return "Feature Request";
  if (text === "query" || text === "question") return "Query";
  if (text === "rma") return "RMA";

  return "Unknown";
}

function normalizeSatisfaction(row) {
  const date = normalizeDate(getValue(row, ["Date", "date"]));
  const comments = clean(getValue(row, ["Comments", "Comment", "comments", "comment"]));

  return {
    ticketId: clean(getValue(row, ["Ticket ID", "Ticket Id", "Ticket Number", "Ticket #"])),
    category: normalizeCategory(getValue(row, ["Category", "category"])),
    date,
    year: yearFromDate(date),
    month: monthFromDate(date),
    comments,
    comment: comments,
    rating: normalizeRating(getValue(row, ["Rating", "rating"])),
    hasComment: Boolean(comments),
    raw: row,
  };
}

function countBy(rows, key) {
  const map = new Map();

  rows.forEach((row) => {
    const value = clean(row[key]) || "Unknown";
    map.set(value, (map.get(value) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function filterSatisfaction(rows = [], filters = {}) {
  return rows.filter((row) => {
    if (filters.year && String(row.year) !== String(filters.year)) return false;
    if (filters.month && String(row.month) !== String(filters.month)) return false;
    if (filters.fromDate && row.date < filters.fromDate) return false;
    if (filters.toDate && row.date > filters.toDate) return false;
    if (filters.category && row.category !== filters.category) return false;
    if (filters.rating && row.rating !== filters.rating) return false;

    if (filters.commentStatus === "with_comment" && !row.hasComment) return false;
    if (filters.commentStatus === "without_comment" && row.hasComment) return false;

    if (filters.search) {
      const text = [row.ticketId, row.category, row.rating, row.comments]
        .join(" ")
        .toLowerCase();

      if (!text.includes(String(filters.search).toLowerCase())) return false;
    }

    return true;
  });
}

export function buildSatisfactionAnalytics(rows = []) {
  const goodRows = rows.filter((row) => row.rating === "Good");
  const badRows = rows.filter((row) => row.rating === "Bad");
  const withComment = rows.filter((row) => row.hasComment);
  const withoutComment = rows.filter((row) => !row.hasComment);

  return {
    totalResponses: rows.length,
    goodResponses: goodRows.length,
    badResponses: badRows.length,
    withComment: withComment.length,
    withoutComment: withoutComment.length,
    goodComments: goodRows.filter((row) => row.hasComment).length,
    badComments: badRows.filter((row) => row.hasComment).length,
    byDate: countBy(rows, "date").sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    ),
    byCategory: ALLOWED_CATEGORIES.map((name) => ({
      name,
      value: rows.filter((row) => row.category === name).length,
    })),
    byRating: countBy(rows, "rating"),
    byCommentStatus: [
      { name: "With Comment", value: withComment.length },
      { name: "Without Comment", value: withoutComment.length },
    ],
    byGoodBadComment: [
      { name: "Good Comments", value: goodRows.filter((row) => row.hasComment).length },
      { name: "Bad Comments", value: badRows.filter((row) => row.hasComment).length },
      { name: "Good Without Comment", value: goodRows.filter((row) => !row.hasComment).length },
      { name: "Bad Without Comment", value: badRows.filter((row) => !row.hasComment).length },
    ],
  };
}

export function buildSatisfactionFilterOptions(rows = []) {
  const unique = (key) =>
    Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort();

  return {
    years: unique("year"),
    months: unique("month"),
    categories: ALLOWED_CATEGORIES,
    ratings: unique("rating"),
  };
}

export async function fetchSatisfactionSheetData() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_SATISFACTION_TAB || "Satisfaction";

  const rawRows = await readSheetRows({ spreadsheetId, tabName });

  const rows = rawRows
    .map(normalizeSatisfaction)
    .filter((row) => row.ticketId || row.comments || row.rating);

  return {
    source: "google_sheet",
    rows,
    total: rows.length,
    message: `Fetched ${rows.length} satisfaction rows from Google Sheet.`,
  };
}
