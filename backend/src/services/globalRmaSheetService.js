import {
  cleanText,
  readSheetRows,
} from "./googleSheetService.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function normalizeKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeHeaderMap(row = {}) {
  return Object.entries(row).reduce(
    (result, [key, value]) => {
      result[normalizeKey(key)] = value;
      return result;
    },
    {},
  );
}

function getValue(row = {}, aliases = []) {
  const normalizedRow = normalizeHeaderMap(row);

  for (const alias of aliases) {
    const value =
      normalizedRow[normalizeKey(alias)];

    if (
      value !== undefined &&
      cleanText(value) !== ""
    ) {
      return value;
    }
  }

  return "";
}

function getFirstEntryDate(row = {}) {
  const candidates = [
    "Entry Date",
    "Entry Date 2",
    "Entry Date 3",
    "Entry Date 4",
    "Entry Date 5",
    "Entry Date 6",
    "Entry Date 7",
    "Entry Date 8",
    "Entry Date 9",
  ];

  for (const header of candidates) {
    const value = getValue(row, [header]);

    if (cleanText(value)) {
      return value;
    }
  }

  return "";
}

function normalizeUpper(value) {
  return cleanText(value).toUpperCase();
}

function normalizeTitle(value) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  return text
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
}

function parseDate(value) {
  const raw = cleanText(value);

  if (!raw) {
    return null;
  }

  /*
   * ISO format: YYYY-MM-DD
   */
  const isoMatch = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/,
  );

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    const date = new Date(year, month - 1, day);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  /*
   * DD/MM/YYYY, MM/DD/YYYY or DD-MM-YYYY.
   * When the first value is greater than 12, it is
   * definitely treated as the day.
   */
  const numericMatch = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/,
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

    /*
     * Treat ambiguous dates as US format because one
     * source tab is US RMA.
     */
    if (first <= 12 && second <= 12) {
      month = first;
      day = second;
    }

    const date = new Date(year, month - 1, day);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const nativeDate = new Date(raw);

  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  return null;
}

function toIsoDate(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(date.getDate()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

function normalizeRegion(sourceRegion) {
  const text = normalizeUpper(sourceRegion);

  if (text.includes("EMEA")) {
    return "EMEA";
  }

  return "USA";
}

function normalizeWarrantyStatus(value) {
  const original = cleanText(value);

  if (!original) {
    return "Unknown";
  }

  const text = original
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (
    text === "INW" ||
    text === "IW" ||
    text.includes("INWARRANTY") ||
    text.includes("UNDERWARRANTY")
  ) {
    return "INW";
  }

  if (
    text === "OOW" ||
    text.includes("OUTOFWARRANTY") ||
    text.includes("OUTWARRANTY") ||
    text.includes("NONWARRANTY") ||
    text.includes("NOWARRANTY")
  ) {
    return "OOW";
  }

  if (
    text.includes("OUT") &&
    text.includes("WARRANT")
  ) {
    return "OOW";
  }

  if (text.includes("WARRANT")) {
    return "INW";
  }

  return "Unknown";
}

function normalizeActionTaken(value) {
  const original = cleanText(value);
  const text = original.toLowerCase();

  if (!text) {
    return "Unknown";
  }

  if (
    text.includes("replace") ||
    text.includes("replacement") ||
    text.includes("exchange") ||
    text.includes("swap")
  ) {
    return "Replaced";
  }

  if (
    text.includes("repair") ||
    text.includes("fixed") ||
    text.includes("service")
  ) {
    return "Repaired";
  }

  if (
    text.includes("refund") ||
    text.includes("credit")
  ) {
    return "Refunded";
  }

  if (
    text.includes("return") ||
    text.includes("send back")
  ) {
    return "Returned";
  }

  if (
    text.includes("reject") ||
    text.includes("decline") ||
    text.includes("denied")
  ) {
    return "Rejected";
  }

  if (
    text.includes("pending") ||
    text.includes("waiting") ||
    text.includes("review")
  ) {
    return "Pending";
  }

  if (
    text.includes("no fault") ||
    text.includes("ntf") ||
    text.includes("no issue")
  ) {
    return "No Fault Found";
  }

  return normalizeTitle(original) || "Unknown";
}

function deriveRmaStatus({
  action,
  processedDate,
  replacementOrderNumber,
  replacementSku,
  replacementSerialNumber,
}) {
  const normalizedAction =
    normalizeActionTaken(action);

  if (normalizedAction === "Replaced") {
    return "Replaced";
  }

  if (normalizedAction === "Repaired") {
    return "Repaired";
  }

  if (normalizedAction === "Returned") {
    return "Returned";
  }

  if (normalizedAction === "Refunded") {
    return "Refunded";
  }

  if (normalizedAction === "Rejected") {
    return "Rejected";
  }

  if (
    replacementOrderNumber ||
    replacementSku ||
    replacementSerialNumber
  ) {
    return "Replacement Processed";
  }

  if (processedDate) {
    return "Processed";
  }

  return "Pending";
}

function deriveFaultCategory(description) {
  const text = cleanText(description).toLowerCase();

  if (!text) {
    return "Uncategorized";
  }

  const categoryRules = [
    {
      name: "Power / Charging",
      keywords: [
        "no power",
        "not power",
        "power issue",
        "power",
        "charging",
        "charge",
        "charger",
        "battery",
        "adapter",
        "will not turn on",
        "won't turn on",
        "does not turn on",
      ],
    },
    {
      name: "Connection / Detection",
      keywords: [
        "not detected",
        "not recognised",
        "not recognized",
        "not mounting",
        "disconnect",
        "connection",
        "usb",
        "hdmi",
        "sdi",
        "thunderbolt",
        "computer cannot see",
        "not connecting",
      ],
    },
    {
      name: "Display / Screen",
      keywords: [
        "screen",
        "display",
        "lcd",
        "black screen",
        "no image",
        "dead pixel",
        "pixel",
        "flicker",
        "flickering",
        "brightness",
        "touch screen",
        "touchscreen",
      ],
    },
    {
      name: "Recording / Media",
      keywords: [
        "recording",
        "record",
        "media",
        "ssd",
        "card",
        "drive",
        "codec",
        "playback",
        "dropped frame",
        "frame drop",
      ],
    },
    {
      name: "Data / File System",
      keywords: [
        "data",
        "file",
        "filesystem",
        "file system",
        "format",
        "corrupt",
        "corrupted",
        "partition",
        "read only",
        "write protected",
      ],
    },
    {
      name: "Performance / Stability",
      keywords: [
        "slow",
        "performance",
        "freeze",
        "freezing",
        "crash",
        "crashing",
        "restart",
        "reboot",
        "unstable",
        "intermittent",
        "random",
      ],
    },
    {
      name: "Physical Damage",
      keywords: [
        "broken",
        "crack",
        "cracked",
        "damaged",
        "damage",
        "bent",
        "dented",
        "dent",
        "plastic",
        "housing",
        "connector broken",
        "physical",
      ],
    },
    {
      name: "Overheating / Temperature",
      keywords: [
        "overheat",
        "overheating",
        "heating",
        "heat",
        "temperature",
        "too hot",
        "hot",
      ],
    },
    {
      name: "Audio",
      keywords: [
        "audio",
        "sound",
        "noise",
        "headphone",
        "speaker",
        "microphone",
        "mic",
      ],
    },
    {
      name: "Firmware / Software",
      keywords: [
        "firmware",
        "software",
        "driver",
        "update",
        "application",
        "app",
        "compatibility",
        "boot loop",
      ],
    },
    {
      name: "Network / Connectivity",
      keywords: [
        "wifi",
        "wi-fi",
        "network",
        "ethernet",
        "bluetooth",
        "stream",
        "streaming",
      ],
    },
    {
      name: "No Fault Found",
      keywords: [
        "no fault found",
        "ntf",
        "no issue",
        "working fine",
        "works fine",
        "passed test",
      ],
    },
  ];

  for (const rule of categoryRules) {
    if (
      rule.keywords.some((keyword) =>
        text.includes(keyword),
      )
    ) {
      return rule.name;
    }
  }

  return "Other Fault";
}

function normalizeAccountType(value) {
  const original = cleanText(value);
  const text = original.toLowerCase();

  if (!text) {
    return "Unclassified";
  }

  if (
    text.includes("distributor") ||
    text.includes("distribution")
  ) {
    return "Distributor";
  }

  if (
    text.includes("reseller") ||
    text.includes("dealer") ||
    text.includes("retailer")
  ) {
    return "Reseller";
  }

  if (
    text.includes("customer") ||
    text.includes("consumer") ||
    text.includes("individual") ||
    text.includes("private") ||
    text.includes("end user") ||
    text.includes("end-user")
  ) {
    return "Customer";
  }

  return normalizeTitle(original) || "Unclassified";
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(
    String(value ?? "").replaceAll(",", ""),
  );

  return Number.isFinite(number)
    ? number
    : fallback;
}

function normalizeGlobalRmaRow(
  row,
  sourceRegion,
  rowNumber,
) {
  const region = normalizeRegion(sourceRegion);

  const entryDateRaw = getFirstEntryDate(row);

  const processedDateRaw = getValue(row, [
    "RO RMA Processed Date",
    "RMA Processed Date",
    "Processed Date",
  ]);

  const entryDateObject = parseDate(entryDateRaw);
  const processedDateObject =
    parseDate(processedDateRaw);

  /*
   * Return Date reporting prefers RO processed date.
   * If the RMA is not processed, Entry Date is used.
   */
  const reportingDateObject =
    processedDateObject || entryDateObject;

  const productWithFault = cleanText(
    getValue(row, [
      "Product with fault",
      "Product With Fault",
      "Faulty Product",
      "Atomos Product",
      "Product",
    ]),
  ).replaceAll('"', "");

  const serialNumber = cleanText(
    getValue(row, [
      "Serial Number of faulty product",
      "Serial Number Of Faulty Product",
      "Faulty Product Serial Number",
      "Serial Number",
      "Serial No",
      "Serial",
    ]),
  );

  const replacementSku = cleanText(
    getValue(row, [
      "Product SKU for replacement",
      "Product SKU For Replacement",
      "Replacement Product SKU",
      "Replacement SKU",
    ]),
  ).replaceAll('"', "");

  const deviceName = cleanText(
    getValue(row, [
      "Device Name",
      "Device",
      "Model",
      "Product Name",
    ]),
  ).replaceAll('"', "");

  /*
   * Product trend should use Product with fault first.
   * Replacement SKU is only a final fallback.
   */
  /*
   * Product Name comes from Device Name.
   * Product SKU comes from Product with fault.
   *
   * Keep product as the default display field for compatibility,
   * but prefer the human-readable Device Name.
   */
  const productName =
    deviceName ||
    productWithFault ||
    replacementSku ||
    "Unknown Product";

  const productSku =
    productWithFault ||
    replacementSku ||
    deviceName ||
    "Unknown Product";

  const product = productName;

  const rmaType = cleanText(
    getValue(row, ["RMA Type"]),
  );

  const stockType = cleanText(
    getValue(row, ["Stock Type"]),
  );

  const quantity = Math.max(
    1,
    normalizeNumber(
      getValue(row, ["Quantity", "Qty"]),
      1,
    ),
  );

  const faultDescription = cleanText(
    getValue(row, [
      "Return Reason (Subject)",
      "Return Reason",
      "Subject",
      "Fault Description",
      "Fault",
      "Issue Description",
      "Description",
    ]),
  );

  const actionRaw = cleanText(
    getValue(row, [
      "Action",
      "Action Taken",
      "Resolution",
      "Final Action",
    ]),
  );

  const customerReturnTrackingNumber =
    cleanText(
      getValue(row, [
        "Customer Return Tracking Number (REQUIRED)",
        "Customer Return Tracking Number",
        "Return Tracking Number",
      ]),
    );

  const rmaNumber = cleanText(
    getValue(row, [
      "RMA NO# (from RO)",
      "RMA NO # (from RO)",
      "RMA No# (from RO)",
      "RMA No (from RO)",
      "RMA Number",
      "RMA No",
      "RMA #",
    ]),
  );

  const trackingNumber = cleanText(
    getValue(row, [
      "Tracking Number",
      "Replacement Tracking Number",
    ]),
  );

  const replacementOrderNumber = cleanText(
    getValue(row, [
      "Replacement Order Number RO Order #",
      "Replacement Order Number",
      "RO Order #",
      "RO Order Number",
    ]),
  );

  const replacementSerialNumber = cleanText(
    getValue(row, [
      "Replacement Order Serial Number",
      "Replacement Serial Number",
      "Replacement Serial",
    ]),
  );

  const roNotes = cleanText(
    getValue(row, [
      "RO Notes",
      "RMA Notes",
      "Notes",
    ]),
  );

  const address2 = cleanText(
    getValue(row, ["Address 2", "Address"]),
  );

  const city = cleanText(
    getValue(row, ["City"]),
  );

  const state = cleanText(
    getValue(row, [
      "State (use 2 digit code)",
      "State",
    ]),
  );

  const country = cleanText(
    getValue(row, ["Country"]),
  );

  const postCode = cleanText(
    getValue(row, [
      "Post Code",
      "Postcode",
      "Postal Code",
      "Zip Code",
    ]),
  );

  /*
   * The source Google Sheet contains one classification column:
   * "Reseller / Customer"
   *
   * Its values may be Customer, Reseller, or Distributor.
   */
  const resellerCustomerRaw = cleanText(
    getValue(row, [
      "Reseller / Customer",
      "Reseller/Customer",
      "Reseller Customer",
      "Customer / Reseller",
      "Customer/Reseller",
      "Account Type",
      "Customer Type",
    ]),
  );

  const customerType =
    normalizeAccountType(resellerCustomerRaw);

  const warrantySource = [
    getValue(row, [
      "INW / OOW",
      "INW/OOW",
      "Warranty Status",
      "Warranty",
    ]),
    rmaType,
    stockType,
    actionRaw,
    roNotes,
  ]
    .filter(Boolean)
    .join(" ");

  const warrantyStatus =
    normalizeWarrantyStatus(warrantySource);

  const actionTaken =
    normalizeActionTaken(actionRaw);

  const rmaStatus = deriveRmaStatus({
    action: actionRaw,
    processedDate: processedDateRaw,
    replacementOrderNumber,
    replacementSku,
    replacementSerialNumber,
  });

  const faultCategory =
    deriveFaultCategory(
      `${faultDescription} ${roNotes}`,
    );

  return {
    id: `${region}-${
      rmaNumber ||
      serialNumber ||
      replacementOrderNumber ||
      rowNumber
    }`,

    sheetRowNumber:
      row.__sheetRowNumber || rowNumber,

    sourceTab: sourceRegion,
    sourceRegion: region,
    region,

    rmaNumber,

    entryDate: toIsoDate(entryDateObject),
    entryDateRaw: cleanText(entryDateRaw),

    processedDate: toIsoDate(
      processedDateObject,
    ),
    processedDateRaw: cleanText(
      processedDateRaw,
    ),

    returnDate: toIsoDate(
      reportingDateObject,
    ),
    returnDateRaw:
      cleanText(processedDateRaw) ||
      cleanText(entryDateRaw),

    returnYear: reportingDateObject
      ? String(reportingDateObject.getFullYear())
      : "Unknown",

    returnMonth: reportingDateObject
      ? MONTH_NAMES[
          reportingDateObject.getMonth()
        ]
      : "Unknown",

    returnMonthNumber: reportingDateObject
      ? reportingDateObject.getMonth() + 1
      : 0,

    warrantyStatus,

    product,
    productName,
    productSku,
    atomosProduct: productName,
    productWithFault,
    deviceName,
    replacementSku,

    serialNumber,
    replacementSerialNumber,

    rmaType: rmaType || "Unknown",
    stockType: stockType || "Unknown",
    quantity,

    rmaStatus,
    actionTaken,
    actionRaw,

    faultDescription,
    faultCategory,

    /*
     * customerType is retained for existing filters and frontend API use.
     * accountType is an explicit alias for the same normalized value.
     */
    customerType,
    accountType: customerType,
    resellerCustomerRaw,

    customerReturnTrackingNumber,
    trackingNumber,
    replacementOrderNumber,

    roNotes,

    address2,
    city,
    state,
    country,
    postCode,

    raw: row,
  };
}

function isMeaningfulRow(row) {
  return Boolean(
    row.rmaNumber ||
      row.serialNumber ||
      row.productWithFault ||
      row.deviceName ||
      row.faultDescription ||
      row.actionRaw ||
      row.entryDate ||
      row.processedDate,
  );
}

function countBy(
  rows,
  key,
  {
    useQuantity = false,
    unknownLabel = "Unknown",
  } = {},
) {
  const totals = new Map();

  rows.forEach((row) => {
    const name =
      cleanText(row[key]) || unknownLabel;

    const increment = useQuantity
      ? Math.max(1, Number(row.quantity || 1))
      : 1;

    totals.set(
      name,
      (totals.get(name) || 0) + increment,
    );
  });

  return Array.from(totals.entries())
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value;
      }

      return a.name.localeCompare(b.name);
    });
}

function buildHighLowTrend(rows, key) {
  const totals = countBy(rows, key, {
    useQuantity: true,
  }).filter(
    (item) =>
      item.name !== "Unknown" &&
      item.name !== "Unknown Product" &&
      item.name !== "Uncategorized",
  );

  if (!totals.length) {
    return [];
  }

  const average =
    totals.reduce(
      (sum, item) => sum + item.value,
      0,
    ) / totals.length;

  return totals.map((item) => ({
    ...item,
    average: Number(average.toFixed(2)),
    trend:
      item.value >= average ? "High" : "Low",
  }));
}

function buildDateWiseRma(rows) {
  const totals = new Map();

  rows.forEach((row) => {
    if (!row.returnDate) {
      return;
    }

    totals.set(
      row.returnDate,
      (totals.get(row.returnDate) || 0) +
        Math.max(1, Number(row.quantity || 1)),
    );
  });

  return Array.from(totals.entries())
    .map(([date, value]) => ({
      date,
      name: date,
      value,
    }))
    .sort((a, b) =>
      a.date.localeCompare(b.date),
    );
}

function buildYearCategoryWiseRma(rows) {
  const totals = new Map();

  rows.forEach((row) => {
    if (
      !row.returnYear ||
      row.returnYear === "Unknown"
    ) {
      return;
    }

    const category =
      row.faultCategory || "Uncategorized";

    const key = `${row.returnYear}|||${category}`;

    totals.set(
      key,
      (totals.get(key) || 0) +
        Math.max(1, Number(row.quantity || 1)),
    );
  });

  return Array.from(totals.entries())
    .map(([key, value]) => {
      const [year, category] =
        key.split("|||");

      return {
        year,
        category,
        value,
      };
    })
    .sort((a, b) => {
      const yearDifference =
        Number(a.year) - Number(b.year);

      if (yearDifference !== 0) {
        return yearDifference;
      }

      return b.value - a.value;
    });
}

function buildMonthCategoryWiseRma(rows) {
  const totals = new Map();

  rows.forEach((row) => {
    if (
      !row.returnYear ||
      row.returnYear === "Unknown" ||
      !row.returnMonth ||
      row.returnMonth === "Unknown"
    ) {
      return;
    }

    const category =
      row.faultCategory || "Uncategorized";

    const key = [
      row.returnYear,
      row.returnMonthNumber,
      row.returnMonth,
      category,
    ].join("|||");

    totals.set(
      key,
      (totals.get(key) || 0) +
        Math.max(1, Number(row.quantity || 1)),
    );
  });

  return Array.from(totals.entries())
    .map(([key, value]) => {
      const [
        year,
        monthNumber,
        month,
        category,
      ] = key.split("|||");

      return {
        year,
        month,
        monthNumber: Number(monthNumber),
        category,
        value,
      };
    })
    .sort((a, b) => {
      const yearDifference =
        Number(a.year) - Number(b.year);

      if (yearDifference !== 0) {
        return yearDifference;
      }

      return (
        a.monthNumber - b.monthNumber
      );
    });
}


function buildLast12MonthTrendTable(
  rows,
  key,
) {
  const datedRows = rows.filter(
    (row) =>
      row.returnDate &&
      row.returnYear !== "Unknown" &&
      Number(row.returnMonthNumber) > 0,
  );

  if (!datedRows.length) {
    return [];
  }

  const latestRow = [...datedRows].sort(
    (a, b) =>
      String(b.returnDate).localeCompare(
        String(a.returnDate),
      ),
  )[0];

  const latestYear = Number(
    latestRow.returnYear,
  );

  const latestMonthIndex =
    Number(latestRow.returnMonthNumber) - 1;

  const periods = Array.from(
    {
      length: 12,
    },
    (_, offset) => {
      const date = new Date(
        latestYear,
        latestMonthIndex - (11 - offset),
        1,
      );

      return {
        key: `${date.getFullYear()}-${String(
          date.getMonth() + 1,
        ).padStart(2, "0")}`,
        label: `${MONTH_NAMES[
          date.getMonth()
        ].slice(0, 3)} ${date.getFullYear()}`,
      };
    },
  );

  const allowedPeriods = new Set(
    periods.map((period) => period.key),
  );

  const seriesMap = new Map();

  datedRows.forEach((row) => {
    const name =
      cleanText(row[key]) || "Unknown";

    if (
      name === "Unknown" ||
      name === "Unknown Product" ||
      name === "Uncategorized"
    ) {
      return;
    }

    const periodKey = `${row.returnYear}-${String(
      row.returnMonthNumber,
    ).padStart(2, "0")}`;

    if (!allowedPeriods.has(periodKey)) {
      return;
    }

    if (!seriesMap.has(name)) {
      seriesMap.set(
        name,
        new Map(
          periods.map((period) => [
            period.key,
            0,
          ]),
        ),
      );
    }

    const periodTotals = seriesMap.get(name);

    periodTotals.set(
      periodKey,
      (periodTotals.get(periodKey) || 0) +
        Math.max(
          1,
          Number(row.quantity || 1),
        ),
    );
  });

  return Array.from(seriesMap.entries())
    .map(([name, totals]) => {
      const points = periods.map(
        (period) => ({
          period: period.label,
          periodKey: period.key,
          value: totals.get(period.key) || 0,
        }),
      );

      const values = points.map(
        (point) => point.value,
      );

      const last =
        values[values.length - 1] || 0;

      const previous =
        values[values.length - 2] || 0;

      const high = Math.max(...values);

      let trend = "Flat";

      if (last > previous) {
        trend = "Up";
      } else if (last < previous) {
        trend = "Down";
      }

      return {
        name,
        points,
        last,
        previous,
        high,
        trend,
      };
    })
    .sort((a, b) => {
      if (b.high !== a.high) {
        return b.high - a.high;
      }

      if (b.last !== a.last) {
        return b.last - a.last;
      }

      return a.name.localeCompare(b.name);
    });
}

function buildRegionWarrantySummary(rows) {
  const regions = ["USA", "EMEA"];

  return regions.map((region) => {
    const regionRows = rows.filter(
      (row) => row.region === region,
    );

    return {
      region,

      INW: regionRows
        .filter(
          (row) =>
            row.warrantyStatus === "INW",
        )
        .reduce(
          (sum, row) =>
            sum +
            Math.max(
              1,
              Number(row.quantity || 1),
            ),
          0,
        ),

      OOW: regionRows
        .filter(
          (row) =>
            row.warrantyStatus === "OOW",
        )
        .reduce(
          (sum, row) =>
            sum +
            Math.max(
              1,
              Number(row.quantity || 1),
            ),
          0,
        ),

      Unknown: regionRows
        .filter(
          (row) =>
            row.warrantyStatus === "Unknown",
        )
        .reduce(
          (sum, row) =>
            sum +
            Math.max(
              1,
              Number(row.quantity || 1),
            ),
          0,
        ),
    };
  });
}

function buildUsEmeaSummary(rows) {
  const buildRegionSummary = (region) => {
    const regionRows = rows.filter(
      (row) => row.region === region,
    );

    const totalQuantity = regionRows.reduce(
      (sum, row) =>
        sum +
        Math.max(
          1,
          Number(row.quantity || 1),
        ),
      0,
    );

    return {
      region,
      totalRecords: regionRows.length,
      totalRma: totalQuantity,

      inWarranty: regionRows.filter(
        (row) =>
          row.warrantyStatus === "INW",
      ).length,

      outOfWarranty: regionRows.filter(
        (row) =>
          row.warrantyStatus === "OOW",
      ).length,

      replaced: regionRows.filter(
        (row) =>
          row.actionTaken === "Replaced",
      ).length,

      repaired: regionRows.filter(
        (row) =>
          row.actionTaken === "Repaired",
      ).length,

      processed: regionRows.filter(
        (row) =>
          row.rmaStatus !== "Pending",
      ).length,

      pending: regionRows.filter(
        (row) =>
          row.rmaStatus === "Pending",
      ).length,

      topProducts: countBy(
        regionRows,
        "product",
        {
          useQuantity: true,
        },
      ).slice(0, 10),

      topFaultCategories: countBy(
        regionRows,
        "faultCategory",
        {
          useQuantity: true,
        },
      ).slice(0, 10),
    };
  };

  const USA = buildRegionSummary("USA");
  const EMEA = buildRegionSummary("EMEA");

  return {
    USA,
    EMEA,

    combined: {
      totalRecords: rows.length,

      totalRma: rows.reduce(
        (sum, row) =>
          sum +
          Math.max(
            1,
            Number(row.quantity || 1),
          ),
        0,
      ),
    },
  };
}

function uniqueValues(rows, key) {
  return Array.from(
    new Set(
      rows
        .map((row) => cleanText(row[key]))
        .filter(Boolean)
        .filter(
          (value) =>
            value !== "Unknown" &&
            value !== "Unknown Product",
        ),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export function filterGlobalRmaRows(
  rows = [],
  filters = {},
) {
  const {
    search,
    region,
    warrantyStatus,
    product,
    rmaStatus,
    actionTaken,
    faultCategory,
    rmaType,
    stockType,
    customerType,
    country,
    year,
    month,
    dateFrom,
    dateTo,
  } = filters;

  const normalizedSearch =
    cleanText(search).toLowerCase();

  return rows.filter((row) => {
    if (
      region &&
      row.region !== region
    ) {
      return false;
    }

    if (
      warrantyStatus &&
      row.warrantyStatus !== warrantyStatus
    ) {
      return false;
    }

    if (
      product &&
      row.product !== product
    ) {
      return false;
    }

    if (
      rmaStatus &&
      row.rmaStatus !== rmaStatus
    ) {
      return false;
    }

    if (
      actionTaken &&
      row.actionTaken !== actionTaken
    ) {
      return false;
    }

    if (
      faultCategory &&
      row.faultCategory !== faultCategory
    ) {
      return false;
    }

    if (
      rmaType &&
      row.rmaType !== rmaType
    ) {
      return false;
    }

    if (
      stockType &&
      row.stockType !== stockType
    ) {
      return false;
    }

    if (
      customerType &&
      row.customerType !== customerType
    ) {
      return false;
    }

    if (
      country &&
      row.country !== country
    ) {
      return false;
    }

    if (
      year &&
      row.returnYear !== String(year)
    ) {
      return false;
    }

    if (
      month &&
      row.returnMonth !== month
    ) {
      return false;
    }

    if (
      dateFrom &&
      (!row.returnDate ||
        row.returnDate < dateFrom)
    ) {
      return false;
    }

    if (
      dateTo &&
      (!row.returnDate ||
        row.returnDate > dateTo)
    ) {
      return false;
    }

    if (normalizedSearch) {
      const searchableText = [
        row.region,
        row.rmaNumber,
        row.product,
        row.productName,
        row.productSku,
        row.productWithFault,
        row.deviceName,
        row.replacementSku,
        row.serialNumber,
        row.replacementSerialNumber,
        row.rmaType,
        row.stockType,
        row.rmaStatus,
        row.actionTaken,
        row.faultCategory,
        row.faultDescription,
        row.resellerCustomerRaw,
        row.customerType,
        row.accountType,
        row.country,
        row.state,
        row.city,
        row.customerReturnTrackingNumber,
        row.trackingNumber,
        row.replacementOrderNumber,
        row.roNotes,
      ]
        .join(" ")
        .toLowerCase();

      if (
        !searchableText.includes(
          normalizedSearch,
        )
      ) {
        return false;
      }
    }

    return true;
  });
}

export function buildGlobalRmaAnalytics(
  rows = [],
) {
  const totalQuantity = rows.reduce(
    (sum, row) =>
      sum +
      Math.max(
        1,
        Number(row.quantity || 1),
      ),
    0,
  );

  return {
    totalRma: totalQuantity,
    totalRecords: rows.length,

    totalUsa: rows
      .filter(
        (row) => row.region === "USA",
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            1,
            Number(row.quantity || 1),
          ),
        0,
      ),

    totalEmea: rows
      .filter(
        (row) => row.region === "EMEA",
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            1,
            Number(row.quantity || 1),
          ),
        0,
      ),

    totalInWarranty: rows.filter(
      (row) =>
        row.warrantyStatus === "INW",
    ).length,

    totalOutOfWarranty: rows.filter(
      (row) =>
        row.warrantyStatus === "OOW",
    ).length,

    totalUnknownWarranty: rows.filter(
      (row) =>
        row.warrantyStatus === "Unknown",
    ).length,

    totalReplaced: rows.filter(
      (row) =>
        row.actionTaken === "Replaced",
    ).length,

    totalRepaired: rows.filter(
      (row) =>
        row.actionTaken === "Repaired",
    ).length,

    totalPending: rows.filter(
      (row) =>
        row.rmaStatus === "Pending",
    ).length,

    totalCustomers: rows
      .filter(
        (row) =>
          row.customerType === "Customer",
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            1,
            Number(row.quantity || 1),
          ),
        0,
      ),

    totalResellers: rows
      .filter(
        (row) =>
          row.customerType === "Reseller",
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            1,
            Number(row.quantity || 1),
          ),
        0,
      ),

    totalDistributors: rows
      .filter(
        (row) =>
          row.customerType === "Distributor",
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            1,
            Number(row.quantity || 1),
          ),
        0,
      ),

    totalUnclassifiedAccounts: rows
      .filter(
        (row) =>
          row.customerType === "Unclassified",
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            1,
            Number(row.quantity || 1),
          ),
        0,
      ),

    datedRmaCount: rows.filter(
      (row) => row.returnDate,
    ).length,

    usEmeaSummary:
      buildUsEmeaSummary(rows),

    regionWarrantySummary:
      buildRegionWarrantySummary(rows),

    byRegion: countBy(rows, "region", {
      useQuantity: true,
    }),

    byWarrantyStatus: countBy(
      rows,
      "warrantyStatus",
      {
        useQuantity: true,
      },
    ),

    byProduct: countBy(rows, "product", {
      useQuantity: true,
    }),

    byRmaStatus: countBy(
      rows,
      "rmaStatus",
      {
        useQuantity: true,
      },
    ),

    byActionTaken: countBy(
      rows,
      "actionTaken",
      {
        useQuantity: true,
      },
    ),

    byFaultCategory: countBy(
      rows,
      "faultCategory",
      {
        useQuantity: true,
      },
    ),

    byCustomerType: countBy(
      rows,
      "customerType",
      {
        useQuantity: true,
      },
    ),

    byAccountType: countBy(
      rows,
      "customerType",
      {
        useQuantity: true,
      },
    ),

    byRmaType: countBy(rows, "rmaType", {
      useQuantity: true,
    }),

    byStockType: countBy(
      rows,
      "stockType",
      {
        useQuantity: true,
      },
    ),

    /*
     * Existing High / Low charts:
     * lifetime filtered case counts only.
     * These are not based on month or year.
     */
    /*
     * Default human-readable product trend.
     */
    productTrend:
      buildHighLowTrend(rows, "productName"),

    /*
     * Separate Product Name and Product SKU datasets allow the
     * frontend to switch instantly without re-syncing the sheet.
     */
    productNameTrend:
      buildHighLowTrend(rows, "productName"),

    productSkuTrend:
      buildHighLowTrend(rows, "productSku"),

    faultCategoryTrend:
      buildHighLowTrend(
        rows,
        "faultCategory",
      ),

    /*
     * Separate 12-month table analytics.
     * These do not affect the two High / Low charts above.
     */
    productLast12MonthTrends:
      buildLast12MonthTrendTable(
        rows,
        "productName",
      ),

    productNameLast12MonthTrends:
      buildLast12MonthTrendTable(
        rows,
        "productName",
      ),

    productSkuLast12MonthTrends:
      buildLast12MonthTrendTable(
        rows,
        "productSku",
      ),

    faultCategoryLast12MonthTrends:
      buildLast12MonthTrendTable(
        rows,
        "faultCategory",
      ),

    dateWiseRma:
      buildDateWiseRma(rows),

    yearCategoryWiseRma:
      buildYearCategoryWiseRma(rows),

    monthCategoryWiseRma:
      buildMonthCategoryWiseRma(rows),
  };
}

export function buildGlobalRmaFilterOptions(
  rows = [],
) {
  return {
    regions: uniqueValues(rows, "region"),

    warrantyStatuses: uniqueValues(
      rows,
      "warrantyStatus",
    ),

    products: uniqueValues(rows, "productName"),
    productNames: uniqueValues(rows, "productName"),
    productSkus: uniqueValues(rows, "productSku"),

    rmaStatuses: uniqueValues(
      rows,
      "rmaStatus",
    ),

    actionsTaken: uniqueValues(
      rows,
      "actionTaken",
    ),

    faultCategories: uniqueValues(
      rows,
      "faultCategory",
    ),

    rmaTypes: uniqueValues(rows, "rmaType"),

    stockTypes: uniqueValues(
      rows,
      "stockType",
    ),

    customerTypes: uniqueValues(
      rows,
      "customerType",
    ),

    countries: uniqueValues(
      rows,
      "country",
    ),

    years: uniqueValues(
      rows,
      "returnYear",
    ).sort(
      (a, b) => Number(b) - Number(a),
    ),

    months: MONTH_NAMES.filter((month) =>
      rows.some(
        (row) =>
          row.returnMonth === month,
      ),
    ),
  };
}

/*
 * This function only reads the two source tabs.
 * It does not create, update or convert any Google Sheet tab.
 */


function validateGlobalRmaTabs({
  usaTab,
  emeaTab,
}) {
  const normalizedUsaTab = cleanText(usaTab).toUpperCase();
  const normalizedEmeaTab = cleanText(emeaTab).toUpperCase();

  if (normalizedUsaTab !== "USA") {
    throw new Error(
      `Global RMA USA tab is configured as "${usaTab}". Expected exact tab name "USA".`,
    );
  }

  if (normalizedEmeaTab !== "EMEA") {
    throw new Error(
      `Global RMA EMEA tab is configured as "${emeaTab}". Expected exact tab name "EMEA".`,
    );
  }
}

export async function fetchGlobalRmaSheetData() {
  const spreadsheetId =
    process.env.GLOBAL_RMA_SHEET_ID ||
    process.env.GOOGLE_SHEET_ID;

  /*
   * Global RMA uses the USA and EMEA tabs.
   *
   * Do not use:
   * - US RMA
   * - EMEA RMA
   *
   * Those belong to the Rush RMA module.
   */
const usaTab =
  process.env.GLOBAL_RMA_USA_TAB || "USA";

const emeaTab =
  process.env.GLOBAL_RMA_EMEA_TAB || "EMEA";

validateGlobalRmaTabs({
  usaTab,
  emeaTab,
});

  if (!spreadsheetId) {
    throw new Error(
      "GLOBAL_RMA_SHEET_ID or GOOGLE_SHEET_ID is missing in backend .env.",
    );
  }

  if (usaTab === "US RMA" || emeaTab === "EMEA RMA") {
    throw new Error(
      "Invalid Global RMA tab configuration. Global RMA must use USA and EMEA tabs; US RMA and EMEA RMA belong to Rush RMA.",
    );
  }

  const [usaSourceRows, emeaSourceRows] = await Promise.all([
    readSheetRows({
      spreadsheetId,
      tabName: usaTab,
    }),

    readSheetRows({
      spreadsheetId,
      tabName: emeaTab,
    }),
  ]);

  const usaRows = usaSourceRows
    .map((row, index) =>
      normalizeGlobalRmaRow(
        row,
        "USA",
        row.__sheetRowNumber || index + 2,
      ),
    )
    .filter(isMeaningfulRow);

  const emeaRows = emeaSourceRows
    .map((row, index) =>
      normalizeGlobalRmaRow(
        row,
        "EMEA",
        row.__sheetRowNumber || index + 2,
      ),
    )
    .filter(isMeaningfulRow);

  /*
   * Merge only inside backend memory.
   * No new Google Sheet tab is created.
   */
  const rows = [...usaRows, ...emeaRows];

  return {
    source: "google_sheet",

    spreadsheetId,

    tabs: {
      USA: usaTab,
      EMEA: emeaTab,
    },

    sourceCounts: {
      USA: usaRows.length,
      EMEA: emeaRows.length,
      total: rows.length,
    },

    rows,

    analytics: buildGlobalRmaAnalytics(rows),

    filters: buildGlobalRmaFilterOptions(rows),

    message:
      `Global RMA loaded from "${usaTab}" and "${emeaTab}". ` +
      `Merged ${usaRows.length} USA rows and ` +
      `${emeaRows.length} EMEA rows in backend memory.`,
  };
}