import { readSheetRows } from "./googleSheetService.js";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  const num = Number(String(value || "0").replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : 0;
}

function getValue(row, keys = []) {
  for (const key of keys) {
    if (row[key] !== undefined && clean(row[key]) !== "") return row[key];
  }
  return "";
}

function normalizeMonth(value) {
  const raw = clean(value);
  if (!raw) return "Unknown";

  const lower = raw.toLowerCase();

  const months = {
    january: "January",
    jan: "January",
    february: "February",
    feb: "February",
    march: "March",
    mar: "March",
    april: "April",
    apr: "April",
    may: "May",
    june: "June",
    jun: "June",
    july: "July",
    jul: "July",
    august: "August",
    aug: "August",
    september: "September",
    sep: "September",
    october: "October",
    oct: "October",
    november: "November",
    nov: "November",
    december: "December",
    dec: "December",
  };

  return months[lower] || raw;
}

function normalizeRmaRow(row, region) {
  const month = normalizeMonth(getValue(row, ["Month", "month"]));
  const product = clean(getValue(row, ["Product", "product"])).replaceAll('"', "");
  const description = clean(getValue(row, ["Description", "description"]));

  return {
    region,
    month,
    product,
    description,

    actualRmaReplacement: toNumber(getValue(row, ["Actual RMA Replacement"])),
    dStockUnitsReceived: toNumber(getValue(row, ["D Stock units received", "D Stock Units Received"])),
    aStockSentOut: toNumber(getValue(row, ["A-Stock Sent Out", "A Stock Sent Out"])),
    rmaUnitsSentOut: toNumber(getValue(row, ["RMA Units Sent Out"])),
    bStockSentOut: toNumber(getValue(row, ["B-Stock Sent Out", "B Stock Sent Out"])),

    dStock: toNumber(getValue(row, ["D - Stock", "D Stock"])),
    bStock: toNumber(getValue(row, ["B - Stock", "B Stock"])),
    aStock: toNumber(getValue(row, ["A - Stock", "A Stock"])),

    pendingToShip: toNumber(getValue(row, ["Pending to ship", "Pending To Ship"])),
    pendingToReceive: toNumber(getValue(row, ["Pending to receive", "Pending To Receive"])),
    googleDriveRmaCases: toNumber(getValue(row, ["Google Drive RMA Cases"])),

    raw: row,
  };
}

function countBy(rows, key, valueKey) {
  const map = new Map();

  rows.forEach((row) => {
    const name = clean(row[key]) || "Unknown";
    const value = valueKey ? Number(row[valueKey] || 0) : 1;
    map.set(name, (map.get(name) || 0) + value);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

export function filterRmaRows(rows = [], filters = {}) {
  return rows.filter((row) => {
    if (filters.region && row.region !== filters.region) return false;
    if (filters.month && row.month !== filters.month) return false;
    if (filters.product && row.product !== filters.product) return false;

    if (filters.search) {
      const text = [row.region, row.month, row.product, row.description]
        .join(" ")
        .toLowerCase();

      if (!text.includes(String(filters.search).toLowerCase())) return false;
    }

    return true;
  });
}

export function buildRmaAnalytics(rows = []) {
  return {
    totalRows: rows.length,
    actualRmaReplacement: sum(rows, "actualRmaReplacement"),
    dStockUnitsReceived: sum(rows, "dStockUnitsReceived"),
    aStockSentOut: sum(rows, "aStockSentOut"),
    rmaUnitsSentOut: sum(rows, "rmaUnitsSentOut"),
    bStockSentOut: sum(rows, "bStockSentOut"),
    dStock: sum(rows, "dStock"),
    bStock: sum(rows, "bStock"),
    aStock: sum(rows, "aStock"),
    pendingToShip: sum(rows, "pendingToShip"),
    pendingToReceive: sum(rows, "pendingToReceive"),
    googleDriveRmaCases: sum(rows, "googleDriveRmaCases"),

    byMonth: countBy(rows, "month", "actualRmaReplacement"),
    byProduct: countBy(rows, "product", "actualRmaReplacement"),
    byRegion: countBy(rows, "region", "actualRmaReplacement"),

    stockSummary: [
      { name: "A Stock", value: sum(rows, "aStock") },
      { name: "B Stock", value: sum(rows, "bStock") },
      { name: "D Stock", value: sum(rows, "dStock") },
    ],

    sentOutSummary: [
      { name: "A-Stock Sent Out", value: sum(rows, "aStockSentOut") },
      { name: "B-Stock Sent Out", value: sum(rows, "bStockSentOut") },
      { name: "RMA Units Sent Out", value: sum(rows, "rmaUnitsSentOut") },
    ],

    pendingSummary: [
      { name: "Pending to Ship", value: sum(rows, "pendingToShip") },
      { name: "Pending to Receive", value: sum(rows, "pendingToReceive") },
    ],
  };
}

export function buildRmaFilterOptions(rows = []) {
  const unique = (key) =>
    Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort();

  return {
    regions: unique("region"),
    months: unique("month"),
    products: unique("product"),
  };
}

export async function fetchGlobalRmaSheetData() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const usTab = process.env.GOOGLE_SHEET_RMA_US_TAB || "US RMA";
  const emeaTab = process.env.GOOGLE_SHEET_RMA_EMEA_TAB || "EMEA RMA";

  const [usRows, emeaRows] = await Promise.all([
    readSheetRows({ spreadsheetId, tabName: usTab }),
    readSheetRows({ spreadsheetId, tabName: emeaTab }),
  ]);

  const rows = [
    ...usRows.map((row) => normalizeRmaRow(row, "US RMA")),
    ...emeaRows.map((row) => normalizeRmaRow(row, "EMEA RMA")),
  ].filter((row) => row.product || row.description);

  return {
    source: "google_sheet",
    rows,
    total: rows.length,
    message: `Fetched ${rows.length} Global RMA rows from Google Sheet.`,
  };
}