import { google } from "googleapis";

function getSheetsClient() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY missing in backend .env");
  }

  return google.sheets({
    version: "v4",
    auth: apiKey,
  });
}

export async function readSheetRows({ spreadsheetId, tabName }) {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:AZ`,
  });

  const values = response.data.values || [];

  if (!values.length) return [];

  const headers = values[0].map((header) => String(header || "").trim());

  return values.slice(1).map((row) => {
    const item = {};

    headers.forEach((header, index) => {
      item[header] = row[index] || "";
    });

    return item;
  });
}