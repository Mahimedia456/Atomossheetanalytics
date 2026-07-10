import {
  FIRST_REPLY_SLA_MINUTES,
  RESOLUTION_SLA_MINUTES,
} from "./agentSheetService.js";

function cleanText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalize(value) {
  return cleanText(value).toLowerCase();
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;

  return (
    Math.round(Number(value || 0) * factor) /
    factor
  );
}

function percentage(value, total) {
  if (!total) return 0;

  return round((value / total) * 100, 1);
}

function average(values = []) {
  const valid = values.filter((value) =>
    Number.isFinite(value)
  );

  if (!valid.length) return 0;

  return round(
    valid.reduce((sum, value) => sum + value, 0) /
      valid.length,
    1
  );
}

function getDateParts(value) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1),
    date: value,
  };
}

function countBy(rows, key) {
  const map = new Map();

  rows.forEach((row) => {
    const name = cleanText(row[key]) || "Unknown";
    map.set(name, (map.get(name) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function filterAgentRows(rows = [], filters = {}) {
  return rows.filter((row) => {
    const dateParts = getDateParts(row.createdDate);

    if (filters.search) {
      const query = normalize(filters.search);

      const haystack = [
        row.ticketId,
        row.agentName,
        row.status,
        row.rating,
        row.category,
        row.satisfactionComment,
      ]
        .map(normalize)
        .join(" ");

      if (!haystack.includes(query)) return false;
    }

    if (
      filters.year &&
      dateParts?.year !== String(filters.year)
    ) {
      return false;
    }

    if (
      filters.month &&
      dateParts?.month !== String(filters.month)
    ) {
      return false;
    }

    if (
      filters.fromDate &&
      row.createdDate < filters.fromDate
    ) {
      return false;
    }

    if (
      filters.toDate &&
      row.createdDate > filters.toDate
    ) {
      return false;
    }

    if (
      filters.agent &&
      normalize(row.agentName) !== normalize(filters.agent)
    ) {
      return false;
    }

    if (
      filters.status &&
      normalize(row.status) !== normalize(filters.status)
    ) {
      return false;
    }

    if (
      filters.rating &&
      normalize(row.rating) !== normalize(filters.rating)
    ) {
      return false;
    }

    if (
      filters.category &&
      normalize(row.category) !== normalize(filters.category)
    ) {
      return false;
    }

    return true;
  });
}

function buildDateAnalytics(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const date = row.createdDate;

    if (!date) return;

    if (!map.has(date)) {
      map.set(date, {
        name: date,
        assigned: 0,
        solved: 0,
        good: 0,
        bad: 0,
        slaMet: 0,
        slaMeasured: 0,
      });
    }

    const item = map.get(date);

    item.assigned += 1;

    if (row.solved) item.solved += 1;
    if (row.rating === "Good") item.good += 1;
    if (row.rating === "Bad") item.bad += 1;

    if (row.firstReplySlaMeasured) {
      item.slaMeasured += 1;
      if (row.firstReplySlaMet) item.slaMet += 1;
    }

    if (row.resolutionSlaMeasured) {
      item.slaMeasured += 1;
      if (row.resolutionSlaMet) item.slaMet += 1;
    }
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      satisfactionScore: percentage(
        item.good,
        item.good + item.bad
      ),
      slaCompliance: percentage(
        item.slaMet,
        item.slaMeasured
      ),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

function buildAgentAnalytics(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const name = row.agentName || "Unknown";

    if (!map.has(name)) {
      map.set(name, {
        name,
        assignedTickets: 0,
        solvedTickets: 0,
        openTickets: 0,
        pendingTickets: 0,
        goodSatisfaction: 0,
        badSatisfaction: 0,
        firstReplyMinutes: [],
        resolutionMinutes: [],
        turnaroundMinutes: [],
        slaMet: 0,
        slaMeasured: 0,
      });
    }

    const item = map.get(name);

    item.assignedTickets += 1;

    if (row.solved) item.solvedTickets += 1;

    const status = normalize(row.status);

    if (["new", "open"].includes(status)) {
      item.openTickets += 1;
    }

    if (status === "pending") {
      item.pendingTickets += 1;
    }

    if (row.rating === "Good") {
      item.goodSatisfaction += 1;
    }

    if (row.rating === "Bad") {
      item.badSatisfaction += 1;
    }

    if (Number.isFinite(row.firstReplyMinutes)) {
      item.firstReplyMinutes.push(
        row.firstReplyMinutes
      );
    }

    if (Number.isFinite(row.firstResolutionMinutes)) {
      item.resolutionMinutes.push(
        row.firstResolutionMinutes
      );
    }

    if (Number.isFinite(row.turnaroundMinutes)) {
      item.turnaroundMinutes.push(
        row.turnaroundMinutes
      );
    }

    if (row.firstReplySlaMeasured) {
      item.slaMeasured += 1;

      if (row.firstReplySlaMet) {
        item.slaMet += 1;
      }
    }

    if (row.resolutionSlaMeasured) {
      item.slaMeasured += 1;

      if (row.resolutionSlaMet) {
        item.slaMet += 1;
      }
    }
  });

  return Array.from(map.values())
    .map((item) => {
      const satisfactionResponses =
        item.goodSatisfaction +
        item.badSatisfaction;

      const resolutionRate = percentage(
        item.solvedTickets,
        item.assignedTickets
      );

      const satisfactionScore = percentage(
        item.goodSatisfaction,
        satisfactionResponses
      );

      const slaCompliance = percentage(
        item.slaMet,
        item.slaMeasured
      );

      const slaBreached = round(
        Math.max(0, 100 - slaCompliance),
        1
      );

      let performanceStatus = "Critical";

      if (
        resolutionRate >= 90 &&
        (
          satisfactionResponses === 0 ||
          satisfactionScore >= 90
        ) &&
        slaCompliance >= 90
      ) {
        performanceStatus = "Excellent";
      } else if (
        resolutionRate >= 75 &&
        (
          satisfactionResponses === 0 ||
          satisfactionScore >= 75
        )
      ) {
        performanceStatus = "Good";
      } else if (resolutionRate >= 60) {
        performanceStatus = "Needs Attention";
      }

      return {
        name: item.name,

        assignedTickets: item.assignedTickets,
        solvedTickets: item.solvedTickets,
        openTickets: item.openTickets,
        pendingTickets: item.pendingTickets,

        resolutionRate,

        goodSatisfaction: item.goodSatisfaction,
        badSatisfaction: item.badSatisfaction,
        satisfactionResponses,
        satisfactionScore,

        averageFirstReplyMinutes: average(
          item.firstReplyMinutes
        ),

        averageResolutionMinutes: average(
          item.resolutionMinutes
        ),

        averageResolutionHours: round(
          average(item.resolutionMinutes) / 60,
          1
        ),

        averageTurnaroundMinutes: average(
          item.turnaroundMinutes
        ),

        averageTurnaroundHours: round(
          average(item.turnaroundMinutes) / 60,
          1
        ),

        slaMetCount: item.slaMet,
        slaMeasuredCount: item.slaMeasured,
        slaCompliance,
        slaBreached,

        performanceStatus,
      };
    })
    .sort(
      (a, b) =>
        b.solvedTickets - a.solvedTickets
    );
}

export function buildAgentReport(rows = []) {
  const byAgent = buildAgentAnalytics(rows);

  const totalTickets = rows.length;

  const solvedTickets = rows.filter(
    (row) => row.solved
  ).length;

  const goodSatisfaction = rows.filter(
    (row) => row.rating === "Good"
  ).length;

  const badSatisfaction = rows.filter(
    (row) => row.rating === "Bad"
  ).length;

  const satisfactionResponses =
    goodSatisfaction + badSatisfaction;

  const measuredRows = rows.flatMap((row) => {
    const measurements = [];

    if (row.firstReplySlaMeasured) {
      measurements.push(row.firstReplySlaMet);
    }

    if (row.resolutionSlaMeasured) {
      measurements.push(row.resolutionSlaMet);
    }

    return measurements;
  });

  const totalSlaMet = measuredRows.filter(Boolean).length;

  return {
    totalTickets,
    solvedTickets,

    resolutionRate: percentage(
      solvedTickets,
      totalTickets
    ),

    satisfactionScore: percentage(
      goodSatisfaction,
      satisfactionResponses
    ),

    averageFirstReplyMinutes: average(
      rows.map((row) => row.firstReplyMinutes)
    ),

    averageResolutionMinutes: average(
      rows.map((row) => row.firstResolutionMinutes)
    ),

    averageResolutionHours: round(
      average(
        rows.map((row) => row.firstResolutionMinutes)
      ) / 60,
      1
    ),

    averageTurnaroundMinutes: average(
      rows.map((row) => row.turnaroundMinutes)
    ),

    averageTurnaroundHours: round(
      average(
        rows.map((row) => row.turnaroundMinutes)
      ) / 60,
      1
    ),

    slaCompliance: percentage(
      totalSlaMet,
      measuredRows.length
    ),

    byDate: buildDateAnalytics(rows),
    byAgent,

    bySolvedAgent: byAgent.map((item) => ({
      name: item.name,
      value: item.solvedTickets,
    })),

    bySatisfactionAgent: byAgent.map((item) => ({
      name: item.name,
      value: item.satisfactionScore,
      responses: item.satisfactionResponses,
    })),

    byTurnaroundAgent: byAgent.map((item) => ({
      name: item.name,
      value: item.averageTurnaroundHours,
    })),

    byFirstReplyAgent: byAgent.map((item) => ({
      name: item.name,
      value: item.averageFirstReplyMinutes,
    })),

    byResolutionAgent: byAgent.map((item) => ({
      name: item.name,
      value: item.averageResolutionHours,
    })),

    byAssignedSolved: byAgent.map((item) => ({
      name: item.name,
      assigned: item.assignedTickets,
      solved: item.solvedTickets,
    })),

    bySlaAgent: byAgent.map((item) => ({
      name: item.name,
      met: item.slaCompliance,
      breached: item.slaBreached,
      measured: item.slaMeasuredCount,
    })),

    bySatisfactionSplit: byAgent.map((item) => ({
      name: item.name,
      good: item.goodSatisfaction,
      bad: item.badSatisfaction,
    })),

    byCategory: countBy(rows, "category"),

    filters: {
      years: [
        ...new Set(
          rows
            .map(
              (row) =>
                getDateParts(row.createdDate)?.year
            )
            .filter(Boolean)
        ),
      ].sort(),

      agents: [
        ...new Set(
          rows
            .map((row) => row.agentName)
            .filter(Boolean)
        ),
      ].sort(),

      statuses: [
        ...new Set(
          rows
            .map((row) => row.status)
            .filter(Boolean)
        ),
      ].sort(),

      ratings: [
        ...new Set(
          rows
            .map((row) => row.rating)
            .filter(Boolean)
        ),
      ].sort(),

      categories: [
        ...new Set(
          rows
            .map((row) => row.category)
            .filter(Boolean)
        ),
      ].sort(),
    },

    slaRules: {
      firstReplyMinutes:
        FIRST_REPLY_SLA_MINUTES,
      firstResolutionMinutes:
        RESOLUTION_SLA_MINUTES,
    },
  };
}
