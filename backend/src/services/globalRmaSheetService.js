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
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    const milliseconds = Math.round(
      (value - 25569) * 86400 * 1000,
    );

    const date = new Date(milliseconds);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const raw = cleanText(value);

  if (!raw) {
    return null;
  }

  function createUtcDate(
    year,
    monthIndex,
    day,
  ) {
    const date = new Date(
      Date.UTC(year, monthIndex, day),
    );

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== monthIndex ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  const isoMatch = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]|$)/,
  );

  if (isoMatch) {
    return createUtcDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
    );
  }

  /*
   * Current Global RMA sheet format:
   * DD-MMM-YYYY
   *
   * Examples:
   * 12-Dec-2025
   * 5-Jan-2026
   * 29-Jun-2026
   */
  const namedMonthMatch = raw.match(
    /^(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{2,4})(?:[T\s]|$)/,
  );

  if (namedMonthMatch) {
    const monthMap = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    };

    const day = Number(
      namedMonthMatch[1],
    );

    const monthIndex =
      monthMap[
        namedMonthMatch[2].toLowerCase()
      ];

    let year = Number(
      namedMonthMatch[3],
    );

    if (year < 100) {
      year += 2000;
    }

    if (monthIndex !== undefined) {
      return createUtcDate(
        year,
        monthIndex,
        day,
      );
    }
  }

  /*
   * DD/MM/YYYY or DD-MM-YYYY.
   * Ambiguous dates are treated as day-first because both
   * Global RMA source tabs now use the same date format.
   */
  const numericMatch = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[T\s]|$)/,
  );

  if (numericMatch) {
    const day = Number(
      numericMatch[1],
    );

    const month = Number(
      numericMatch[2],
    );

    let year = Number(
      numericMatch[3],
    );

    if (year < 100) {
      year += 2000;
    }

    return createUtcDate(
      year,
      month - 1,
      day,
    );
  }

  const nativeDate = new Date(raw);

  if (
    !Number.isNaN(nativeDate.getTime())
  ) {
    return new Date(
      Date.UTC(
        nativeDate.getFullYear(),
        nativeDate.getMonth(),
        nativeDate.getDate(),
      ),
    );
  }

  return null;
}

function toIsoDate(date) {
  if (
    !date ||
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  const year = date.getUTCFullYear();

  const month = String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getUTCDate(),
  ).padStart(2, "0");

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
      name: "Manufacturer Fault",
      keywords: [
        "housing issue",
        "housing fault",
        "manufacturing fault",
        "manufacturer fault",
        "factory fault",
        "assembly fault",
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

function normalizeReceivedStockType(value) {
  const raw = cleanText(value);

  if (!raw) {
    return "";
  }

  const normalized = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.includes("D") || normalized.includes("D STOCK") || normalized === "DSTOCK") {
    return "D Stock";
  }

  if (tokens.includes("B") || normalized.includes("B STOCK") || normalized === "BSTOCK") {
    return "B Stock";
  }

  if (tokens.includes("A") || normalized.includes("A STOCK") || normalized === "ASTOCK") {
    return "A Stock";
  }

  if (tokens.includes("R") || normalized.includes("R STOCK") || normalized === "RSTOCK") {
    return "R Stock";
  }

  return normalizeTitle(raw) || "Other Stock";
}

function isReceiveStockType(value) {
  return Boolean(normalizeReceivedStockType(value));
}

function deriveSentStockType(replacementSku) {
  const raw = cleanText(replacementSku);

  if (!raw) {
    return "";
  }

  const normalized = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (
    tokens.includes("R") ||
    normalized.includes("R STOCK") ||
    /(^|[-_/\s])R($|[-_/\s])/.test(raw.toUpperCase())
  ) {
    return "R Stock";
  }

  if (
    tokens.includes("B") ||
    normalized.includes("B STOCK") ||
    /(^|[-_/\s])B($|[-_/\s])/.test(raw.toUpperCase())
  ) {
    return "B Stock";
  }

  return "Other Stock";
}

function buildActionProductSummary(rows) {
  const totals = new Map();

  rows.forEach((row) => {
    const action = cleanText(row.actionTaken) || "Unknown";
    const product = cleanText(row.productName) || "Unknown Product";
    const key = `${action}|||${product}`;

    totals.set(
      key,
      (totals.get(key) || 0) + Math.max(1, Number(row.quantity || 1)),
    );
  });

  return Array.from(totals.entries())
    .map(([key, value]) => {
      const [action, product] = key.split("|||");

      return {
        name: `${action} — ${product}`,
        action,
        product,
        value,
      };
    })
    .filter(
      (item) =>
        item.action !== "Unknown" &&
        item.product !== "Unknown Product",
    )
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function buildProductFaultDeviceMap(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const productWithFault = cleanText(row.productWithFault);
    const deviceName = cleanText(row.deviceName || row.productName);

    if (productWithFault && deviceName) {
      map.set(normalizeKey(productWithFault), deviceName);
    }
  });

  return map;
}

function buildReceivedStockByDevice(rows, allRows = rows) {
  const productFaultDeviceMap =
    buildProductFaultDeviceMap(allRows);

  const totals = new Map();

  rows
    .filter((row) => row.receiveOnly)
    .forEach((row) => {
      const mappedDeviceName =
        productFaultDeviceMap.get(
          normalizeKey(row.productWithFault),
        );

      const name = cleanText(
        row.deviceName ||
          mappedDeviceName ||
          row.productName ||
          row.productWithFault,
      ) || "Unknown Product";

      const quantity = Math.max(
        1,
        Number(row.quantity || 1),
      );

      totals.set(
        name,
        (totals.get(name) || 0) + quantity,
      );
    });

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.name !== "Unknown Product")
    .sort(
      (a, b) =>
        b.value - a.value ||
        a.name.localeCompare(b.name),
    );
}

function buildReceivedStockTypeSummary(rows) {
  return countBy(
    rows.filter((row) => row.receiveOnly),
    "receivedStockType",
    {
      useQuantity: true,
      unknownLabel: "Other Stock",
    },
  );
}

function buildSentStockByDevice(rows) {
  const totals = new Map();

  rows
    .filter((row) => cleanText(row.replacementSku))
    .forEach((row) => {
      const name = cleanText(row.deviceName || row.productName) || "Unknown Product";

      if (!totals.has(name)) {
        totals.set(name, {
          name,
          RStock: 0,
          BStock: 0,
          OtherStock: 0,
          total: 0,
        });
      }

      const item = totals.get(name);
      const quantity = Math.max(1, Number(row.quantity || 1));

      if (row.sentStockType === "R Stock") {
        item.RStock += quantity;
      } else if (row.sentStockType === "B Stock") {
        item.BStock += quantity;
      } else {
        item.OtherStock += quantity;
      }

      item.total += quantity;
    });

  return Array.from(totals.values())
    .filter((item) => item.name !== "Unknown Product")
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
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
   * Global RMA Year, Month and Date filters are based on
   * Entry Date. RO processed date remains a separate field.
   *
   * Processed date is used only when Entry Date is blank.
   */
  const reportingDateObject =
    entryDateObject || processedDateObject;

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
      "Product SKU for replacement (no more ninja's without my approval)",
      "Product SKU for replacement (no more ninjas without my approval)",
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

  const receivedStockType =
    normalizeReceivedStockType(stockType);

  const receiveOnly = Boolean(receivedStockType);

  const receiveDeviceName =
    deviceName ||
    productName ||
    productWithFault ||
    replacementSku ||
    "Unknown Product";

  const sentStockType = deriveSentStockType(replacementSku);

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

  /*
   * Read the company/reseller name from the exact source column
   * available in both USA and EMEA tabs.
   */
  const companyName = cleanText(
    getValue(row, [
      "Company (if Applicable)",
      "Company (If Applicable)",
      "Company if Applicable",
      "Company",
      "Reseller Company",
      "Reseller Name",
    ]),
  );

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
      ? String(
          reportingDateObject.getUTCFullYear(),
        )
      : "Unknown",

    returnMonth: reportingDateObject
      ? MONTH_NAMES[
          reportingDateObject.getUTCMonth()
        ]
      : "Unknown",

    returnMonthNumber: reportingDateObject
      ? reportingDateObject.getUTCMonth() + 1
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
    receivedStockType,
    receiveOnly,
    sentStockType,
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
    companyName,

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
    companyName,
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
      companyName &&
      row.companyName !== companyName
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
        row.sentStockType,
        row.rmaStatus,
        row.actionTaken,
        row.faultCategory,
        row.faultDescription,
        row.resellerCustomerRaw,
        row.customerType,
        row.accountType,
        row.companyName,
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

    actionProductSummary:
      buildActionProductSummary(rows),

    replacementUnitsByDevice: countBy(
      rows.filter((row) => cleanText(row.replacementSku)),
      "deviceName",
      {
        useQuantity: true,
        unknownLabel: "Unknown Product",
      },
    ).filter((item) => item.name !== "Unknown Product"),

    receiveOnlyByDevice:
      buildReceivedStockByDevice(rows),

    dStockReceivedByDevice:
      buildReceivedStockByDevice(
        rows.filter(
          (row) =>
            row.receivedStockType === "D Stock",
        ),
        rows,
      ),

    receivedStockTypeSummary:
      buildReceivedStockTypeSummary(rows),

    sentStockByDevice:
      buildSentStockByDevice(rows),

    stockMovementSummary: [
      ...buildReceivedStockTypeSummary(rows).map(
        (item) => ({
          name: `${item.name} Received`,
          value: item.value,
        }),
      ),
      {
        name: "R Stock Sent",
        value: rows
          .filter((row) => row.sentStockType === "R Stock")
          .reduce(
            (sum, row) =>
              sum + Math.max(1, Number(row.quantity || 1)),
            0,
          ),
      },
      {
        name: "B Stock Sent",
        value: rows
          .filter((row) => row.sentStockType === "B Stock")
          .reduce(
            (sum, row) =>
              sum + Math.max(1, Number(row.quantity || 1)),
            0,
          ),
      },
      {
        name: "Other Stock Sent",
        value: rows
          .filter((row) => row.sentStockType === "Other Stock")
          .reduce(
            (sum, row) =>
              sum + Math.max(1, Number(row.quantity || 1)),
            0,
          ),
      },
    ],

    totalDStockReceived: rows
      .filter(
        (row) =>
          row.receivedStockType === "D Stock",
      )
      .reduce(
        (sum, row) =>
          sum + Math.max(1, Number(row.quantity || 1)),
        0,
      ),

    totalRStockSent: rows
      .filter((row) => row.sentStockType === "R Stock")
      .reduce(
        (sum, row) =>
          sum + Math.max(1, Number(row.quantity || 1)),
        0,
      ),

    totalBStockSent: rows
      .filter((row) => row.sentStockType === "B Stock")
      .reduce(
        (sum, row) =>
          sum + Math.max(1, Number(row.quantity || 1)),
        0,
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

    companyNames: uniqueValues(
      rows,
      "companyName",
    ),

    companyNamesByCustomerType: {
      Company: uniqueValues(
        rows.filter((row) => row.customerType === "Company"),
        "companyName",
      ),
      Reseller: uniqueValues(
        rows.filter((row) => row.customerType === "Reseller"),
        "companyName",
      ),
      Distributor: uniqueValues(
        rows.filter((row) => row.customerType === "Distributor"),
        "companyName",
      ),
    },

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