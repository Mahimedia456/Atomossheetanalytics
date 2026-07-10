import { readSheetRows } from "./googleSheetService.js";

function clean(value) {
  return String(value || "").trim();
}

function normalizeDate(value) {
  if (!value) return "";

  const raw = clean(value);

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
}

function monthFromDate(dateValue) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.getMonth() + 1;
}

function yearFromDate(dateValue) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.getFullYear();
}

function joinMulti(...values) {
  return values
    .map(clean)
    .filter(Boolean)
    .join(", ");
}

function getValue(row, keys = []) {
  for (const key of keys) {
    if (row[key] !== undefined && clean(row[key])) return row[key];
  }

  return "";
}

function normalizeTicket(row) {
  const date = normalizeDate(getValue(row, ["Date", "date"]));

  const ticketNumber = clean(
    getValue(row, ["Ticket Number", "Ticket No", "Ticket", "Ticket ID"])
  );

  const product = joinMulti(
    getValue(row, ["Product 1"]),
    getValue(row, ["Product 2"]),
    getValue(row, ["Product 3 & 4", "Product 3", "Product 4"])
  );

  const category = joinMulti(
    getValue(row, ["Category 1"]),
    getValue(row, ["Category 2"]),
    getValue(row, ["Category 3 & 4", "Category 3", "Category 4"])
  );

  return {
    id: ticketNumber,
    ticketNumber,
    tse: clean(getValue(row, ["TSE", "Tse", "Agent", "Agent Name"])),
    agent: clean(getValue(row, ["TSE", "Tse", "Agent", "Agent Name"])),
    region: clean(getValue(row, ["Region"])),
    internal: clean(getValue(row, ["Internal"])),
    submissionStatus: clean(
      getValue(row, ["Submission status", "Submission Status"])
    ),
    date,
    year: yearFromDate(date),
    month: monthFromDate(date),
    comment: clean(getValue(row, ["Comment if required", "Comment"])),
    product,
    subject: clean(getValue(row, ["Subject"])),
    category,
    featureRequestSummary: clean(
      getValue(row, ["Feature Request Summary with priority"])
    ),
    raw: row,
  };
}

function dedupeTickets(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const key = clean(row.ticketNumber);

    if (!key) return;

    if (!map.has(key)) {
      map.set(key, row);
    }
  });

  return Array.from(map.values());
}

function countBy(rows, key) {
  const map = new Map();

  rows.forEach((row) => {
    const value = clean(row[key]) || "Unknown";

    if (value.includes(",")) {
      value.split(",").forEach((part) => {
        const item = clean(part) || "Unknown";
        map.set(item, (map.get(item) || 0) + 1);
      });
    } else {
      map.set(value, (map.get(value) || 0) + 1);
    }
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function filterTickets(rows = [], filters = {}) {
  return rows.filter((row) => {
    if (filters.year && String(row.year) !== String(filters.year)) return false;
    if (filters.month && String(row.month) !== String(filters.month)) return false;
    if (filters.fromDate && row.date < filters.fromDate) return false;
    if (filters.toDate && row.date > filters.toDate) return false;
    if (filters.region && row.region !== filters.region) return false;
    if (filters.tse && row.tse !== filters.tse) return false;
    if (filters.submissionStatus && row.submissionStatus !== filters.submissionStatus) {
      return false;
    }
    if (filters.product && !row.product.includes(filters.product)) return false;
    if (filters.category && !row.category.includes(filters.category)) return false;

    if (filters.search) {
      const text = [
        row.ticketNumber,
        row.tse,
        row.agent,
        row.region,
        row.subject,
        row.product,
        row.category,
        row.comment,
        row.featureRequestSummary,
      ]
        .join(" ")
        .toLowerCase();

      if (!text.includes(String(filters.search).toLowerCase())) return false;
    }

    return true;
  });
}

export function buildTicketAnalytics(rows = []) {
  return {
    totalTickets: rows.length,
    byDate: countBy(rows, "date").sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    ),
    byProduct: countBy(rows, "product"),
    byCategory: countBy(rows, "category"),
    byRegion: countBy(rows, "region"),
    byTse: countBy(rows, "tse"),
    bySubmissionStatus: countBy(rows, "submissionStatus"),
  };
}

export function buildFilterOptions(rows = []) {
  const unique = (key) =>
    Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort();

  const splitUnique = (key) =>
    Array.from(
      new Set(
        rows
          .flatMap((row) => String(row[key] || "").split(","))
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ).sort();

  return {
    years: unique("year"),
    months: unique("month"),
    regions: unique("region"),
    tses: unique("tse"),
    submissionStatuses: unique("submissionStatus"),
    products: splitUnique("product"),
    categories: splitUnique("category"),
  };
}

export async function fetchTicketSheetData() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tabName =
    process.env.GOOGLE_SHEET_TICKET_TAB ||
    process.env.TICKET_TAB ||
    "Ticket";

  const rawRows = await readSheetRows({ spreadsheetId, tabName });

  const normalized = rawRows
    .map(normalizeTicket)
    .filter((row) => row.ticketNumber);

  // Duplicate removal disabled because duplicate ticket rows may contain
  // separate product/category/comment data that is required for reports.
  // const rows = dedupeTickets(normalized);

  const rows = normalized;

  return {
    source: "google_sheet",
    rows,
    total: rows.length,
    message: `Fetched ${rows.length} ticket rows from Google Sheet.`,
  };
}