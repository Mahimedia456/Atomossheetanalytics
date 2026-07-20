import { readSheetRows } from "./googleSheetService.js";

function clean(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeHeaderMap(row = {}) {
  return Object.entries(row).reduce((result, [key, value]) => {
    result[normalizeKey(key)] = value;
    return result;
  }, {});
}

function getValue(row = {}, keys = []) {
  const normalizedRow = normalizeHeaderMap(row);

  for (const key of keys) {
    const value = normalizedRow[normalizeKey(key)];

    if (value !== undefined && clean(value)) {
      return value;
    }
  }

  return "";
}

function normalizeDate(value) {
  const raw = clean(value);

  if (!raw) {
    return "";
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = String(Number(isoMatch[2])).padStart(2, "0");
    const day = String(Number(isoMatch[3])).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const monthNameMatch = raw.match(
    /^(\d{1,2})[-/\s]([A-Za-z]+)[-/\s](\d{2,4})$/,
  );

  if (monthNameMatch) {
    const day = String(monthNameMatch[1]).padStart(2, "0");
    const monthName = monthNameMatch[2].toLowerCase();
    let year = Number(monthNameMatch[3]);

    if (year < 100) {
      year += 2000;
    }

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

    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  const numericMatch = raw.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/,
  );

  if (numericMatch) {
    const first = Number(numericMatch[1]);
    const second = Number(numericMatch[2]);
    let year = Number(numericMatch[3]);

    if (year < 100) {
      year += 2000;
    }

    let day = first;
    let month = second;

    if (first <= 12 && second > 12) {
      month = first;
      day = second;
    }

    const candidate = new Date(year, month - 1, day);

    if (!Number.isNaN(candidate.getTime())) {
      return [
        candidate.getFullYear(),
        String(candidate.getMonth() + 1).padStart(2, "0"),
        String(candidate.getDate()).padStart(2, "0"),
      ].join("-");
    }
  }

  const parsed = new Date(raw);

  if (!Number.isNaN(parsed.getTime())) {
    return [
      parsed.getFullYear(),
      String(parsed.getMonth() + 1).padStart(2, "0"),
      String(parsed.getDate()).padStart(2, "0"),
    ].join("-");
  }

  return "";
}

function yearFromDate(date) {
  if (!date) {
    return "";
  }

  return Number(date.slice(0, 4)) || "";
}

function monthFromDate(date) {
  if (!date) {
    return "";
  }

  return Number(date.slice(5, 7)) || "";
}

function normalizeSocialPlatform(value) {
  const original = clean(value);
  const text = original.toLowerCase();

  if (!text) {
    return "Unknown";
  }

  let platform = "Other";

  if (
    text.includes("facebook") ||
    /(^|\s)fb($|\s)/.test(text)
  ) {
    platform = "Facebook";
  } else if (
    text.includes("instagram") ||
    text.includes("insta") ||
    /(^|\s)ig($|\s)/.test(text)
  ) {
    platform = "Instagram";
  } else if (text.includes("reddit")) {
    platform = "Reddit";
  } else if (
    text.includes("messenger") ||
    text.includes("facebook inbox") ||
    text.includes("fb inbox")
  ) {
    platform = "Messenger";
  } else if (text.includes("youtube")) {
    platform = "YouTube";
  } else if (text.includes("linkedin")) {
    platform = "LinkedIn";
  } else if (
    text.includes("twitter") ||
    text === "x" ||
    text.includes("x comment")
  ) {
    platform = "X / Twitter";
  }

  let interaction = "";

  if (text.includes("comment")) {
    interaction = "Comment";
  } else if (
    text.includes("inbox") ||
    text.includes("message") ||
    text.includes("dm")
  ) {
    interaction = "Inbox";
  } else if (text.includes("post")) {
    interaction = "Post";
  }

  if (platform === "Messenger") {
    return "Messenger";
  }

  if (platform !== "Other") {
    return interaction
      ? `${platform} ${interaction}`
      : platform;
  }

  return original;
}

function normalizeCustomerResponse(value) {
  const original = clean(value);
  const text = original.toLowerCase();

  if (!text) {
    return "Unknown";
  }

  if (
    text.includes("positive") ||
    text.includes("good") ||
    text.includes("happy") ||
    text.includes("satisfied") ||
    text.includes("appreciat") ||
    text.includes("thank")
  ) {
    return "Positive";
  }

  if (
    text.includes("negative") ||
    text.includes("bad") ||
    text.includes("unhappy") ||
    text.includes("dissatisfied") ||
    text.includes("angry") ||
    text.includes("complaint")
  ) {
    return "Negative";
  }

  if (
    text.includes("neutral") ||
    text.includes("mixed") ||
    text.includes("normal")
  ) {
    return "Neutral";
  }

  return original;
}

function normalizeSocialRow(row, index) {
  const postQueryDate = normalizeDate(
    getValue(row, [
      "Post/Query date",
      "Post Query Date",
      "Post Date",
    ]),
  );

  const responseDate = normalizeDate(
    getValue(row, ["Date", "Response Date"]),
  );

  const effectiveDate = postQueryDate || responseDate;

  const socialPlatformRaw = clean(
    getValue(row, [
      "Inbox/Post/Comment",
      "Inbox / Post / Comment",
      "Inbox Post Comment",
      "Social Platform",
      "Platform",
    ]),
  );

  const customerResponseRaw = clean(
    getValue(row, [
      "Reactive/Product",
      "Reactive / Product",
      "Customer Response",
      "Response Sentiment",
      "Sentiment",
    ]),
  );

  return {
    id: `social-${row.__sheetRowNumber || index + 2}`,
    sheetRowNumber: row.__sheetRowNumber || index + 2,

    socialPlatform: normalizeSocialPlatform(socialPlatformRaw),
    socialPlatformRaw,

    region: clean(getValue(row, ["Region"])) || "unknown",
    country: clean(getValue(row, ["Country"])) || "unknown",

    postQueryDate,
    effectiveDate,
    year: yearFromDate(effectiveDate),
    month: monthFromDate(effectiveDate),

    product: clean(getValue(row, ["Product"])) || "Unknown",
    postQuery: clean(
      getValue(row, ["Post/Query", "Post Query", "Query"]),
    ),
    response: clean(getValue(row, ["Response"])),
    category: clean(getValue(row, ["Category"])) || "Unknown",

    customerResponse: normalizeCustomerResponse(customerResponseRaw),
    customerResponseRaw,

    raw: row,
  };
}

function countBy(rows, key) {
  const totals = new Map();

  rows.forEach((row) => {
    const name = clean(row[key]) || "Unknown";
    totals.set(name, (totals.get(name) || 0) + 1);
  });

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value;
      }

      return a.name.localeCompare(b.name);
    });
}

function uniqueValues(rows, key) {
  return Array.from(
    new Set(
      rows
        .map((row) => clean(row[key]))
        .filter(Boolean)
        .filter(
          (value) =>
            value !== "Unknown" &&
            value !== "unknown",
        ),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function sortRowsNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const dateDifference = String(
      b.postQueryDate || b.effectiveDate || "",
    ).localeCompare(
      String(a.postQueryDate || a.effectiveDate || ""),
    );

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return Number(b.sheetRowNumber || 0) - Number(a.sheetRowNumber || 0);
  });
}

export function filterSocialRows(rows = [], filters = {}) {
  const filteredRows = rows.filter((row) => {
    if (
      filters.year &&
      String(row.year) !== String(filters.year)
    ) {
      return false;
    }

    if (
      filters.month &&
      String(row.month) !== String(filters.month)
    ) {
      return false;
    }

    const dateFrom = filters.fromDate || filters.dateFrom;
    const dateTo = filters.toDate || filters.dateTo;
    const filterDate = row.postQueryDate || row.effectiveDate;

    if (
      dateFrom &&
      (!filterDate || filterDate < dateFrom)
    ) {
      return false;
    }

    if (
      dateTo &&
      (!filterDate || filterDate > dateTo)
    ) {
      return false;
    }

    if (
      filters.region &&
      row.region !== filters.region
    ) {
      return false;
    }

    if (
      filters.country &&
      row.country !== filters.country
    ) {
      return false;
    }

    if (
      filters.product &&
      row.product !== filters.product
    ) {
      return false;
    }

    if (
      filters.category &&
      row.category !== filters.category
    ) {
      return false;
    }

    if (
      filters.socialPlatform &&
      row.socialPlatform !== filters.socialPlatform
    ) {
      return false;
    }

    if (
      filters.customerResponse &&
      row.customerResponse !== filters.customerResponse
    ) {
      return false;
    }

    if (filters.search) {
      const text = [
        row.socialPlatform,
        row.socialPlatformRaw,
        row.region,
        row.country,
        row.product,
        row.postQuery,
        row.response,
        row.category,
        row.customerResponse,
        row.customerResponseRaw,
      ]
        .join(" ")
        .toLowerCase();

      if (
        !text.includes(
          String(filters.search).trim().toLowerCase(),
        )
      ) {
        return false;
      }
    }

    return true;
  });

  return sortRowsNewestFirst(filteredRows);
}

export function buildSocialAnalytics(rows = []) {
  const knownCountries = uniqueValues(rows, "country");
  const knownProducts = uniqueValues(rows, "product");
  const knownCategories = uniqueValues(rows, "category");

  return {
    totalQueries: rows.length,
    countries: knownCountries.length,
    productCount: knownProducts.length,
    categoryCount: knownCategories.length,

    byDate: countBy(rows, "postQueryDate").sort((a, b) =>
      String(a.name).localeCompare(String(b.name)),
    ),
    byProduct: countBy(rows, "product").filter(
      (item) => item.name !== "Unknown",
    ),
    byCategory: countBy(rows, "category").filter(
      (item) => item.name !== "Unknown",
    ),
    byRegion: countBy(rows, "region").filter(
      (item) => item.name !== "unknown",
    ),
    byCountry: countBy(rows, "country").filter(
      (item) => item.name !== "unknown",
    ),
    byPlatform: countBy(rows, "socialPlatform").filter(
      (item) => item.name !== "Unknown",
    ),
    byCustomerResponse: countBy(
      rows,
      "customerResponse",
    ).filter((item) => item.name !== "Unknown"),
  };
}

export function buildSocialFilterOptions(rows = []) {
  return {
    years: uniqueValues(rows, "year").sort(
      (a, b) => Number(b) - Number(a),
    ),
    months: uniqueValues(rows, "month").sort(
      (a, b) => Number(a) - Number(b),
    ),
    regions: uniqueValues(rows, "region"),
    countries: uniqueValues(rows, "country"),
    products: uniqueValues(rows, "product"),
    categories: uniqueValues(rows, "category"),
    socialPlatforms: uniqueValues(rows, "socialPlatform"),
    customerResponses: uniqueValues(rows, "customerResponse"),
  };
}

export async function fetchSocialSheetData() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tabName =
    process.env.GOOGLE_SHEET_SOCIAL_TAB || "Social";

  if (!spreadsheetId) {
    throw new Error(
      "GOOGLE_SHEET_ID is missing in backend .env.",
    );
  }

  const rawRows = await readSheetRows({
    spreadsheetId,
    tabName,
  });

  const rows = sortRowsNewestFirst(
    rawRows
      .map(normalizeSocialRow)
      .filter(
        (row) =>
          row.postQuery ||
          row.response ||
          row.product !== "Unknown" ||
          row.socialPlatform !== "Unknown",
      ),
  );

  return {
    source: "google_sheet",
    rows,
    total: rows.length,
    message: `Fetched ${rows.length} social rows from Google Sheet.`,
  };
}
