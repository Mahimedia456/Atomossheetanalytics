import {
  readSheetRows,
} from "./googleSheetService.js";

function clean(value) {
  return String(
    value ?? "",
  )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function toNumber(value) {
  const normalizedValue = String(
    value ?? "0",
  )
    .replace(
      /,/g,
      "",
    )
    .trim();

  const numberValue = Number(
    normalizedValue,
  );

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : 0;
}

function getValue(
  row,
  keys = [],
) {
  for (const key of keys) {
    if (
      row[key] !== undefined &&
      row[key] !== null &&
      clean(row[key]) !== ""
    ) {
      return row[key];
    }
  }

  return "";
}

function normalizeMonth(value) {
  const raw = clean(
    value,
  );

  if (!raw) {
    return "Unknown";
  }

  const lower =
    raw.toLowerCase();

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
    sept: "September",

    october: "October",
    oct: "October",

    november: "November",
    nov: "November",

    december: "December",
    dec: "December",
  };

  return (
    months[lower] ||
    raw
  );
}

function normalizeRmaRow(
  row,
  region,
) {
  const month =
    normalizeMonth(
      getValue(
        row,
        [
          "Month",
          "month",
        ],
      ),
    );

  const product =
    clean(
      getValue(
        row,
        [
          "Product",
          "product",
        ],
      ),
    ).replaceAll(
      '"',
      "",
    );

  const description =
    clean(
      getValue(
        row,
        [
          "Description",
          "description",
        ],
      ),
    );

  return {
    region,
    month,
    product,
    description,

    actualRmaReplacement:
      toNumber(
        getValue(
          row,
          [
            "Actual RMA Replacement",
            "Actual Rma Replacement",
            "actual rma replacement",
          ],
        ),
      ),

    /*
     * Reads the new column from both:
     * US RMA
     * EMEA RMA
     */
    dStockUnitsReceived:
      toNumber(
        getValue(
          row,
          [
            "D Stock units received",
            "D Stock Units Received",
            "D stock units received",
            "D-Stock Units Received",
            "D Stock Received",
          ],
        ),
      ),

    aStockSentOut:
      toNumber(
        getValue(
          row,
          [
            "A-Stock Sent Out",
            "A Stock Sent Out",
            "A-stock sent out",
          ],
        ),
      ),

    rmaUnitsSentOut:
      toNumber(
        getValue(
          row,
          [
            "RMA Units Sent Out",
            "Rma Units Sent Out",
            "RMA units sent out",
          ],
        ),
      ),

    bStockSentOut:
      toNumber(
        getValue(
          row,
          [
            "B-Stock Sent Out",
            "B Stock Sent Out",
            "B-stock sent out",
          ],
        ),
      ),

    dStock:
      toNumber(
        getValue(
          row,
          [
            "D - Stock",
            "D Stock",
            "D-Stock",
          ],
        ),
      ),

    bStock:
      toNumber(
        getValue(
          row,
          [
            "B - Stock",
            "B Stock",
            "B-Stock",
          ],
        ),
      ),

    aStock:
      toNumber(
        getValue(
          row,
          [
            "A - Stock",
            "A Stock",
            "A-Stock",
          ],
        ),
      ),

    pendingToShip:
      toNumber(
        getValue(
          row,
          [
            "Pending to ship",
            "Pending To Ship",
            "Pending to Ship",
          ],
        ),
      ),

    pendingToReceive:
      toNumber(
        getValue(
          row,
          [
            "Pending to receive",
            "Pending To Receive",
            "Pending to Receive",
          ],
        ),
      ),

    googleDriveRmaCases:
      toNumber(
        getValue(
          row,
          [
            "Google Drive RMA Cases",
            "Google drive RMA cases",
            "Total Queries",
          ],
        ),
      ),

    raw: row,
  };
}

function countBy(
  rows,
  key,
  valueKey,
) {
  const map =
    new Map();

  rows.forEach(
    (row) => {
      const name =
        clean(
          row[key],
        ) ||
        "Unknown";

      const value =
        valueKey
          ? Number(
              row[valueKey] ||
                0,
            )
          : 1;

      map.set(
        name,
        (
          map.get(
            name,
          ) || 0
        ) + value,
      );
    },
  );

  return Array.from(
    map.entries(),
  )
    .map(
      ([
        name,
        value,
      ]) => ({
        name,
        value,
      }),
    )
    .sort(
      (a, b) =>
        b.value -
        a.value,
    );
}

function sum(
  rows,
  key,
) {
  return rows.reduce(
    (
      total,
      row,
    ) =>
      total +
      Number(
        row[key] ||
          0,
      ),
    0,
  );
}

export function filterRmaRows(
  rows = [],
  filters = {},
) {
  return rows.filter(
    (row) => {
      if (
        filters.region &&
        row.region !==
          filters.region
      ) {
        return false;
      }

      if (
        filters.month &&
        row.month !==
          filters.month
      ) {
        return false;
      }

      /*
       * Frontend filter key remains product,
       * but the selected value comes from
       * the Description column.
       */
      if (
        filters.product &&
        row.description !==
          filters.product
      ) {
        return false;
      }

      if (
        filters.search
      ) {
        const searchValue =
          String(
            filters.search,
          )
            .trim()
            .toLowerCase();

        const searchableText = [
          row.region,
          row.month,
          row.product,
          row.description,
          row.actualRmaReplacement,
          row.dStockUnitsReceived,
          row.aStockSentOut,
          row.rmaUnitsSentOut,
          row.bStockSentOut,
          row.dStock,
          row.bStock,
          row.aStock,
          row.pendingToShip,
          row.pendingToReceive,
          row.googleDriveRmaCases,
        ]
          .join(" ")
          .toLowerCase();

        if (
          !searchableText.includes(
            searchValue,
          )
        ) {
          return false;
        }
      }

      return true;
    },
  );
}

export function buildRmaAnalytics(
  rows = [],
) {
  const actualRmaReplacement =
    sum(
      rows,
      "actualRmaReplacement",
    );

  const dStockUnitsReceived =
    sum(
      rows,
      "dStockUnitsReceived",
    );

  const aStockSentOut =
    sum(
      rows,
      "aStockSentOut",
    );

  const rmaUnitsSentOut =
    sum(
      rows,
      "rmaUnitsSentOut",
    );

  const bStockSentOut =
    sum(
      rows,
      "bStockSentOut",
    );

  const dStock =
    sum(
      rows,
      "dStock",
    );

  const bStock =
    sum(
      rows,
      "bStock",
    );

  const aStock =
    sum(
      rows,
      "aStock",
    );

  const pendingToShip =
    sum(
      rows,
      "pendingToShip",
    );

  const pendingToReceive =
    sum(
      rows,
      "pendingToReceive",
    );

  const googleDriveRmaCases =
    sum(
      rows,
      "googleDriveRmaCases",
    );

  return {
    totalRows:
      rows.length,

    actualRmaReplacement,
    dStockUnitsReceived,
    aStockSentOut,
    rmaUnitsSentOut,
    bStockSentOut,
    dStock,
    bStock,
    aStock,
    pendingToShip,
    pendingToReceive,
    googleDriveRmaCases,

    byMonth:
      countBy(
        rows,
        "month",
        "actualRmaReplacement",
      ),

    byProduct:
      countBy(
        rows,
        "product",
        "actualRmaReplacement",
      ),

    byRegion:
      countBy(
        rows,
        "region",
        "actualRmaReplacement",
      ),

    /*
     * New chart data.
     * This is displayed beside Sent Out Summary.
     */
    dStockReceivedSummary: [
      {
        name:
          "D Stock Received",
        value:
          dStockUnitsReceived,
      },
    ],

    /*
     * Existing stock balance summary.
     * Frontend will render this at the end.
     */
    stockSummary: [
      {
        name:
          "A Stock",
        value:
          aStock,
      },
      {
        name:
          "B Stock",
        value:
          bStock,
      },
      {
        name:
          "D Stock",
        value:
          dStock,
      },
    ],

    sentOutSummary: [
      {
        name:
          "A-Stock Sent Out",
        value:
          aStockSentOut,
      },
      {
        name:
          "B-Stock Sent Out",
        value:
          bStockSentOut,
      },
      {
        name:
          "RMA Units Sent Out",
        value:
          rmaUnitsSentOut,
      },
    ],

    pendingSummary: [
      {
        name:
          "Pending to Ship",
        value:
          pendingToShip,
      },
      {
        name:
          "Pending to Receive",
        value:
          pendingToReceive,
      },
    ],
  };
}

export function buildRmaFilterOptions(
  rows = [],
) {
  const unique = (
    key,
  ) =>
    Array.from(
      new Set(
        rows
          .map(
            (row) =>
              clean(
                row[key],
              ),
          )
          .filter(
            Boolean,
          ),
      ),
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
          undefined,
          {
            numeric: true,
            sensitivity:
              "base",
          },
        ),
    );

  return {
    regions:
      unique(
        "region",
      ),

    months:
      unique(
        "month",
      ),

    products:
      unique(
        "product",
      ),

    descriptions:
      unique(
        "description",
      ),
  };
}

export async function fetchGlobalRmaSheetData() {
  const spreadsheetId =
    process.env
      .GOOGLE_SHEET_ID;

  const usTab =
    process.env
      .GOOGLE_SHEET_RMA_US_TAB ||
    "US RMA";

  const emeaTab =
    process.env
      .GOOGLE_SHEET_RMA_EMEA_TAB ||
    "EMEA RMA";

  const [
    usRows,
    emeaRows,
  ] =
    await Promise.all([
      readSheetRows({
        spreadsheetId,
        tabName:
          usTab,
      }),

      readSheetRows({
        spreadsheetId,
        tabName:
          emeaTab,
      }),
    ]);

  const rows = [
    ...usRows.map(
      (row) =>
        normalizeRmaRow(
          row,
          "US RMA",
        ),
    ),

    ...emeaRows.map(
      (row) =>
        normalizeRmaRow(
          row,
          "EMEA RMA",
        ),
    ),
  ].filter(
    (row) =>
      row.product ||
      row.description,
  );

  return {
    source:
      "google_sheet",

    rows,

    total:
      rows.length,

    message:
      `Fetched ${rows.length} Global RMA rows from Google Sheet.`,
  };
}