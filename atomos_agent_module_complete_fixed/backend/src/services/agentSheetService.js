import { readSheetRows } from "./googleSheetService.js";

export const FIRST_REPLY_SLA_MINUTES = 60;
export const RESOLUTION_SLA_MINUTES = 1440;

function cleanText(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getValue(row, names = []) {
  const entries = Object.entries(row || {});

  for (const name of names) {
    const target = normalizeKey(name);

    const match = entries.find(
      ([key]) => normalizeKey(key) === target
    );

    if (match && cleanText(match[1])) {
      return cleanText(match[1]);
    }
  }

  return "";
}

function parseDate(value) {
  const text = cleanText(value);

  if (!text) return null;

  const direct = new Date(text);

  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const months = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };

  const parts = text
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .split(/[-/ ]+/)
    .filter(Boolean);

  if (parts.length >= 3) {
    const day = Number(parts[0]);
    const month = months[String(parts[1]).toLowerCase()];
    let year = Number(parts[2]);

    if (year < 100) year += 2000;

    if (
      Number.isFinite(day) &&
      month !== undefined &&
      Number.isFinite(year)
    ) {
      const date = new Date(year, month, day);

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

function formatDate(value) {
  const date = parseDate(value);

  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function minutesBetween(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);

  if (!start || !end) return null;

  const difference = end.getTime() - start.getTime();

  if (difference < 0) return null;

  return Math.round(difference / 60000);
}

function bracketToMinimumMinutes(value) {
  const text = cleanText(value)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;

  if (
    text === "no replies" ||
    text === "no reply" ||
    text === "no response"
  ) {
    return null;
  }

  if (
    text.includes(">24") ||
    text.includes("more than 24") ||
    text.includes("over 24")
  ) {
    return 1440;
  }

  const minuteRange = text.match(
    /([\d.]+)\s*-\s*([\d.]+)\s*(minute|minutes|min|mins)/
  );

  if (minuteRange) {
    return Math.round(Number(minuteRange[1]));
  }

  const hourRange = text.match(
    /([\d.]+)\s*-\s*([\d.]+)\s*(hour|hours|hr|hrs)/
  );

  if (hourRange) {
    return Math.round(Number(hourRange[1]) * 60);
  }

  const dayRange = text.match(
    /([\d.]+)\s*-\s*([\d.]+)\s*(day|days)/
  );

  if (dayRange) {
    return Math.round(Number(dayRange[1]) * 1440);
  }

  const number = Number(text.match(/[\d.]+/)?.[0]);

  if (!Number.isFinite(number)) return null;

  if (text.includes("day")) {
    return Math.round(number * 1440);
  }

  if (
    text.includes("hour") ||
    text.includes(" hr")
  ) {
    return Math.round(number * 60);
  }

  return Math.round(number);
}

function normalizeRating(value) {
  const text = cleanText(value).toLowerCase();

  if (
    ["good", "positive", "satisfied", "very satisfied", "4", "5"].includes(text)
  ) {
    return "Good";
  }

  if (
    ["bad", "negative", "dissatisfied", "unsatisfied", "poor", "1", "2"].includes(text)
  ) {
    return "Bad";
  }

  if (text === "offered") return "Offered";

  return cleanText(value) || "Unknown";
}

function normalizeStatus(value) {
  return cleanText(value) || "Unknown";
}

function normalizeAgentRow(row, index) {
  const ticketId = getValue(row, ["Ticket ID"]);
  const createdRaw = getValue(row, ["Ticket created - Date"]);
  const updatedRaw = getValue(row, ["Ticket updated - Date"]);
  const assignedRaw = getValue(row, ["Ticket assigned - Date"]);
  const solvedRaw = getValue(row, ["Ticket solved - Date"]);

  const agentName =
    getValue(row, ["Agent Name"]) || "Unknown";

  const status = normalizeStatus(
    getValue(row, ["Ticket status"])
  );

  const rating = normalizeRating(
    getValue(row, ["Ticket satisfaction rating"])
  );

  const firstResolutionBracket = getValue(row, [
    "First resolution time brackets",
  ]);

  const firstReplyBracket = getValue(row, [
    "First reply time brackets",
  ]);

  const satisfactionComment = getValue(row, [
    "Ticket satisfaction comment",
  ]);

  const category =
    getValue(row, ["Category"]) || "Unknown";

  const firstReplyMinutes =
    bracketToMinimumMinutes(firstReplyBracket);

  let firstResolutionMinutes =
    bracketToMinimumMinutes(firstResolutionBracket);

  if (firstResolutionMinutes === null) {
    firstResolutionMinutes = minutesBetween(
      createdRaw,
      solvedRaw
    );
  }

  const turnaroundMinutes = minutesBetween(
    assignedRaw || createdRaw,
    solvedRaw
  );

  const solved =
    Boolean(solvedRaw) ||
    ["solved", "closed"].includes(status.toLowerCase());

  const firstReplySlaMeasured =
    Number.isFinite(firstReplyMinutes);

  const resolutionSlaMeasured =
    Number.isFinite(firstResolutionMinutes);

  const firstReplySlaMet =
    firstReplySlaMeasured &&
    firstReplyMinutes <= FIRST_REPLY_SLA_MINUTES;

  const resolutionSlaMet =
    resolutionSlaMeasured &&
    firstResolutionMinutes <= RESOLUTION_SLA_MINUTES;

  return {
    id: ticketId || `agent-row-${index}`,
    ticketId: ticketId || `ROW-${index}`,

    createdDate: formatDate(createdRaw),
    updatedDate: formatDate(updatedRaw),
    assignedDate: formatDate(assignedRaw),
    solvedDate: formatDate(solvedRaw),

    agentName,
    status,
    rating,
    category,

    firstReplyBracket,
    firstResolutionBracket,

    firstReplyMinutes,
    firstResolutionMinutes,
    turnaroundMinutes,

    satisfactionComment,

    solved,

    firstReplySlaMeasured,
    resolutionSlaMeasured,
    firstReplySlaMet,
    resolutionSlaMet,

    raw: row,
  };
}

export async function fetchAgentSheetData() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tabName =
    process.env.GOOGLE_SHEET_AGENT_TAB || "Agent";

  if (!spreadsheetId) {
    throw new Error(
      "GOOGLE_SHEET_ID is missing in backend .env"
    );
  }

  const rows = await readSheetRows({
    spreadsheetId,
    tabName,
  });

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row, index) =>
      normalizeAgentRow(row, index + 2)
    )
    .filter(
      (row) =>
        row.ticketId ||
        row.agentName !== "Unknown"
    );
}
