import { google } from "googleapis";

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeSheetTabName(tabName) {
  return `'${String(tabName).replaceAll("'", "''")}'`;
}

/*
 * Repeated column headings such as:
 *
 * Entry Date
 * Entry Date
 * Entry Date
 *
 * become:
 *
 * Entry Date
 * Entry Date 2
 * Entry Date 3
 *
 * This only changes backend object keys.
 * The source Google Sheet is never modified.
 */
function makeUniqueHeaders(headers = []) {
  const counts = new Map();

  return headers.map((header, index) => {
    const originalHeader =
      cleanText(header) || `Column ${index + 1}`;

    const normalizedHeader = originalHeader.toLowerCase();

    const count =
      (counts.get(normalizedHeader) || 0) + 1;

    counts.set(normalizedHeader, count);

    if (count === 1) {
      return originalHeader;
    }

    return `${originalHeader} ${count}`;
  });
}

function findHeaderRowIndex(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return -1;
  }

  /*
   * Search the first 20 rows because some sheets may contain
   * a title or blank lines above the actual headers.
   */
  const searchLimit = Math.min(values.length, 20);

  for (let index = 0; index < searchLimit; index += 1) {
    const row = values[index] || [];

    const normalizedCells = row.map((cell) =>
      cleanText(cell).toLowerCase(),
    );

    const hasProductHeader = normalizedCells.some((cell) =>
      [
        "product with fault",
        "serial number of faulty product",
        "rma type",
        "return reason (subject)",
        "rma no# (from ro)",
      ].includes(cell),
    );

    if (hasProductHeader) {
      return index;
    }
  }

  /*
   * Fall back to the first non-empty row.
   */
  return values.findIndex((row) =>
    (row || []).some((cell) => cleanText(cell)),
  );
}

function convertValuesToRows(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const headerRowIndex = findHeaderRowIndex(values);

  if (headerRowIndex < 0) {
    return [];
  }

  const headers = makeUniqueHeaders(
    values[headerRowIndex] || [],
  );

  return values
    .slice(headerRowIndex + 1)
    .map((cells, rowOffset) => {
      const row = headers.reduce(
        (result, header, columnIndex) => {
          result[header] = cells?.[columnIndex] ?? "";
          return result;
        },
        {},
      );

      row.__sheetRowNumber =
        headerRowIndex + rowOffset + 2;

      return row;
    })
    .filter((row) => {
      return Object.entries(row).some(
        ([key, value]) =>
          key !== "__sheetRowNumber" &&
          cleanText(value),
      );
    });
}

function getGoogleSheetsClient() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is missing in backend environment variables.",
    );
  }

  return google.sheets({
    version: "v4",
    auth: apiKey,
  });
}

export async function readSheetValues({
  spreadsheetId,
  tabName,
}) {
  if (!spreadsheetId) {
    throw new Error(
      "Google spreadsheet ID is required.",
    );
  }

  if (!tabName) {
    throw new Error(
      "Google Sheet tab name is required.",
    );
  }

  const sheets = getGoogleSheetsClient();

  const range = escapeSheetTabName(tabName);

  try {
    const response =
      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: "FORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
        majorDimension: "ROWS",
      });

    return response.data.values || [];
  } catch (error) {
    const apiMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      "Unknown Google Sheets API error.";

    throw new Error(
      `Unable to read Google Sheet tab "${tabName}": ${apiMessage}`,
    );
  }
}

export async function readSheetRows({
  spreadsheetId,
  tabName,
}) {
  const values = await readSheetValues({
    spreadsheetId,
    tabName,
  });

  return convertValuesToRows(values);
}

export {
  cleanText,
  convertValuesToRows,
  makeUniqueHeaders,
};