import { readSheetRows } from "./googleSheetService.js";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeDate(value) {
  const raw = clean(value);
  if (!raw) return "";

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const match = raw.match(/^(\d{1,2})[-/\s]([A-Za-z]+)[-/\s](\d{2,4})$/);

  if (match) {
    const day = String(match[1]).padStart(2, "0");
    const monthName = match[2].toLowerCase();
    let year = Number(match[3]);

    if (year < 100) year += 2000;

    const months = {
      january: "01",
      jan: "01",
      february: "02",
      feb: "02",
      march: "03",
      mar: "03",
      april: "04",
      apr: "04",
      may: "05",
      june: "06",
      jun: "06",
      july: "07",
      jul: "07",
      august: "08",
      aug: "08",
      september: "09",
      sep: "09",
      october: "10",
      oct: "10",
      november: "11",
      nov: "11",
      december: "12",
      dec: "12",
    };

    const month = months[monthName];

    if (month) return `${year}-${month}-${day}`;
  }

  return raw;
}

function yearFromDate(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.getFullYear();
}

function monthFromDate(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.getMonth() + 1;
}

function getValue(row, keys = []) {
  for (const key of keys) {
    if (row[key] !== undefined && clean(row[key])) return row[key];
  }

  return "";
}

function normalizeStatus(value) {
  const text = clean(value).toLowerCase();

  if (["solved", "resolve", "resolved"].includes(text)) return "Solved";
  if (["unsolved", "unresolve", "unresolved"].includes(text)) return "Unsolved";

  return clean(value) || "Unknown";
}

function normalizeSocialRow(row) {
  const postQueryDate = normalizeDate(
    getValue(row, ["Post/Query date", "Post Query Date", "Post Date"])
  );

  const date = normalizeDate(getValue(row, ["Date", "Response Date"]));

  return {
    customerName: clean(getValue(row, ["Customer Name"])),
    region: clean(getValue(row, ["Region"])) || "unknown",
    country: clean(getValue(row, ["Country"])) || "unknown",
    postQueryDate,
    submitted: clean(getValue(row, ["Submitted"])),
    date,
    year: yearFromDate(date || postQueryDate),
    month: monthFromDate(date || postQueryDate),
    product: clean(getValue(row, ["Product"])),
    postQuery: clean(getValue(row, ["Post/Query", "Post Query", "Query"])),
    response: clean(getValue(row, ["Response"])),
    category: clean(getValue(row, ["Category"])),
    status: normalizeStatus(getValue(row, ["Resolve/Unresolve", "Status"])),
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

export function filterSocialRows(rows = [], filters = {}) {
  return rows.filter((row) => {
    if (filters.year && String(row.year) !== String(filters.year)) return false;
    if (filters.month && String(row.month) !== String(filters.month)) return false;
    if (filters.fromDate && row.date < filters.fromDate) return false;
    if (filters.toDate && row.date > filters.toDate) return false;
    if (filters.region && row.region !== filters.region) return false;
    if (filters.country && row.country !== filters.country) return false;
    if (filters.product && row.product !== filters.product) return false;
    if (filters.category && row.category !== filters.category) return false;
    if (filters.status && row.status !== filters.status) return false;

    if (filters.search) {
      const text = [
        row.customerName,
        row.region,
        row.country,
        row.product,
        row.postQuery,
        row.response,
        row.category,
        row.status,
      ]
        .join(" ")
        .toLowerCase();

      if (!text.includes(String(filters.search).toLowerCase())) return false;
    }

    return true;
  });
}

export function buildSocialAnalytics(rows = []) {
  const solved = rows.filter((row) => row.status === "Solved").length;
  const unsolved = rows.filter((row) => row.status === "Unsolved").length;

  return {
    totalQueries: rows.length,
    solved,
    unsolved,
    countries: countBy(rows, "country").filter((x) => x.name !== "unknown").length,
    byDate: countBy(rows, "date").sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    ),
    byProduct: countBy(rows, "product"),
    byCategory: countBy(rows, "category"),
    byRegion: countBy(rows, "region"),
    byCountry: countBy(rows, "country"),
    byStatus: countBy(rows, "status"),
  };
}

export function buildSocialFilterOptions(rows = []) {
  const unique = (key) =>
    Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort();

  return {
    years: unique("year"),
    months: unique("month"),
    regions: unique("region"),
    countries: unique("country"),
    products: unique("product"),
    categories: unique("category"),
    statuses: unique("status"),
  };
}

export async function fetchSocialSheetData() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_SOCIAL_TAB || "Social";

  const rawRows = await readSheetRows({ spreadsheetId, tabName });

  const rows = rawRows
    .map(normalizeSocialRow)
    .filter((row) => row.customerName || row.postQuery || row.response);

  return {
    source: "google_sheet",
    rows,
    total: rows.length,
    message: `Fetched ${rows.length} social rows from Google Sheet.`,
  };
}