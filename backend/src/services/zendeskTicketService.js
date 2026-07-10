import axios from "axios";

function getZendeskClient() {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  const email = process.env.ZENDESK_EMAIL;
  const token = process.env.ZENDESK_API_TOKEN;

  if (!subdomain || !email || !token) return null;

  return axios.create({
    baseURL: `https://${subdomain}.zendesk.com/api/v2`,
    auth: {
      username: `${email}/token`,
      password: token,
    },
    timeout: 60000,
  });
}

function clean(value) {
  return String(value || "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function titleCase(value) {
  return clean(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function pickFirst(...values) {
  return values.find((value) => clean(value)) || "";
}

async function fetchAllZendeskUsers(client) {
  const users = new Map();
  let url = "/users.json?page[size]=100";

  while (url) {
    const { data } = await client.get(url);

    (data.users || []).forEach((user) => {
      users.set(String(user.id), user.name || user.email || String(user.id));
    });

    url = data.links?.next
      ? data.links.next.replace(client.defaults.baseURL, "")
      : data.next_page
      ? data.next_page.replace(client.defaults.baseURL, "")
      : null;

    if (users.size >= 50000) break;
  }

  return users;
}

async function fetchTicketFields(client) {
  const fieldMap = new Map();
  let url = "/ticket_fields.json?page[size]=100";

  while (url) {
    const { data } = await client.get(url);

    (data.ticket_fields || []).forEach((field) => {
      fieldMap.set(String(field.id), {
        id: field.id,
        title: field.title || "",
        rawTitle: field.raw_title || "",
      });
    });

    url = data.links?.next
      ? data.links.next.replace(client.defaults.baseURL, "")
      : data.next_page
      ? data.next_page.replace(client.defaults.baseURL, "")
      : null;
  }

  return fieldMap;
}

function getCustomFieldByKeyword(ticket, fieldMap, keywords = []) {
  const fields = ticket.custom_fields || [];

  for (const field of fields) {
    const meta = fieldMap.get(String(field.id));
    const searchable = lower(`${field.id} ${meta?.title || ""} ${meta?.rawTitle || ""}`);

    const matched = keywords.some((keyword) => searchable.includes(lower(keyword)));

    if (matched && field.value) return field.value;
  }

  return "";
}

function extractAtomosProduct(ticket, fieldMap) {
  return titleCase(
    pickFirst(
      getCustomFieldByKeyword(ticket, fieldMap, ["atomos product"]),
      getCustomFieldByKeyword(ticket, fieldMap, ["atomos_product"]),
      getCustomFieldByKeyword(ticket, fieldMap, ["product"])
    )
  );
}

function extractTseAgent(ticket, fieldMap, assigneeName) {
  return titleCase(
    pickFirst(
      getCustomFieldByKeyword(ticket, fieldMap, ["tse agent"]),
      getCustomFieldByKeyword(ticket, fieldMap, ["tse_agent"]),
      getCustomFieldByKeyword(ticket, fieldMap, ["tse"]),
      getCustomFieldByKeyword(ticket, fieldMap, ["agent"]),
      assigneeName
    )
  );
}

function deriveRegion({ assigneeName, tseAgent, tags, subject }) {
  const text = lower([assigneeName, tseAgent, tags, subject].join(" "));

  if (
    text.includes("emea") ||
    text.includes("emma") ||
    text.includes("europe") ||
    text.includes("uk")
  ) {
    return "EMEA";
  }

  if (
    text.includes("usa") ||
    text.includes(" us ") ||
    text.includes("america") ||
    text.includes("americas")
  ) {
    return "US";
  }

  if (
    text.includes("apac") ||
    text.includes("asia") ||
    text.includes("australia") ||
    text.includes("pacific")
  ) {
    return "APAC";
  }

  return "Unknown";
}

function deriveCategoryType(ticket) {
  const text = lower([
    ticket.subject,
    ticket.description,
    ticket.tags,
    ticket.supportCategory,
    ticket.type,
  ].join(" "));

  if (text.includes("rma")) return "RMA";
  if (text.includes("feature")) return "Feature Request";
  if (text.includes("bug") || text.includes("error") || text.includes("issue")) return "Bug";
  if (text.includes("query") || text.includes("question") || text.includes("inquiry")) return "Query";

  return ticket.type ? titleCase(ticket.type) : "Unknown";
}

function normalizeTicket(ticket, maps = {}) {
  const createdAt = ticket.created_at ? new Date(ticket.created_at) : null;
  const tags = Array.isArray(ticket.tags) ? ticket.tags.join(", ") : "";

  const requesterName =
    maps.users.get(String(ticket.requester_id)) || String(ticket.requester_id || "");

  const assigneeName =
    maps.users.get(String(ticket.assignee_id)) || String(ticket.assignee_id || "");

  const supportCategory = titleCase(
    pickFirst(
      getCustomFieldByKeyword(ticket, maps.fieldMap, ["support category"]),
      getCustomFieldByKeyword(ticket, maps.fieldMap, ["category"])
    )
  );

  const product = extractAtomosProduct(ticket, maps.fieldMap);
  const tseAgent = extractTseAgent(ticket, maps.fieldMap, assigneeName);

  const categoryType = deriveCategoryType({
    subject: ticket.subject,
    description: ticket.description,
    tags,
    supportCategory,
    type: ticket.type,
  });

  return {
    id: ticket.id,
    ticketId: ticket.id,
    date: createdAt ? createdAt.toISOString().slice(0, 10) : "",
    year: createdAt ? createdAt.getFullYear() : "",
    month: createdAt ? createdAt.getMonth() + 1 : "",

    subject: ticket.subject || "",
    description: ticket.description || "",
    status: ticket.status || "",
    type: ticket.type || "",

    requesterId: ticket.requester_id || "",
    requester: requesterName,

    assigneeId: ticket.assignee_id || "",
    assignee: assigneeName,

    tseAgent,
    region: deriveRegion({
      assigneeName,
      tseAgent,
      tags,
      subject: ticket.subject,
    }),

    categoryType,
    supportCategory: supportCategory || categoryType,
    product,

    tags,
    createdAt: ticket.created_at || "",
    updatedAt: ticket.updated_at || "",
    solvedAt: ticket.solved_at || "",
    raw: ticket,
  };
}

export async function fetchZendeskTickets() {
  const client = getZendeskClient();

  if (!client) {
    return {
      source: "none",
      rows: [],
      total: 0,
      message: "Zendesk credentials missing. Check backend .env.",
    };
  }

  try {
    const [users, fieldMap] = await Promise.all([
      fetchAllZendeskUsers(client),
      fetchTicketFields(client),
    ]);

    const rows = [];

    const startTime = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000);
    const endTime = Math.floor(new Date("2027-01-01T00:00:00Z").getTime() / 1000);

    let url = `/incremental/tickets/cursor.json?start_time=${startTime}`;

    while (url) {
      const { data } = await client.get(url);

      const tickets = data.tickets || [];

      const filteredTickets = tickets.filter((ticket) => {
        const created = ticket.created_at
          ? new Date(ticket.created_at).getTime() / 1000
          : 0;

        return created >= startTime && created < endTime;
      });

      rows.push(
        ...filteredTickets.map((ticket) =>
          normalizeTicket(ticket, { users, fieldMap })
        )
      );

      const lastTicket = tickets[tickets.length - 1];
      const lastCreated = lastTicket?.created_at
        ? new Date(lastTicket.created_at).getTime() / 1000
        : startTime;

      if (lastCreated >= endTime) {
        break;
      }

      if (data.end_of_stream) {
        break;
      }

      if (data.after_url) {
        url = data.after_url.replace(client.defaults.baseURL, "");
      } else {
        break;
      }

      if (rows.length >= 30000) break;
    }

    const uniqueRows = Array.from(
      new Map(rows.map((row) => [String(row.ticketId), row])).values()
    );

    return {
      source: "zendesk",
      rows: uniqueRows,
      total: uniqueRows.length,
      message: `Fetched ${uniqueRows.length} tickets from Zendesk for 2026.`,
    };
  } catch (error) {
    console.error("Zendesk ticket fetch failed:", {
      status: error?.response?.status,
      data: error?.response?.data,
      code: error?.code,
      message: error?.message,
    });

    throw new Error(
      error?.response?.data?.error ||
        error?.response?.data?.description ||
        error?.code ||
        error.message ||
        "Zendesk ticket fetch failed"
    );
  }
}

export function filterTickets(rows = [], filters = {}) {
  return rows.filter((row) => {
    if (filters.year && String(row.year) !== String(filters.year)) return false;
    if (filters.month && String(row.month) !== String(filters.month)) return false;
    if (filters.fromDate && row.date < filters.fromDate) return false;
    if (filters.toDate && row.date > filters.toDate) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.region && row.region !== filters.region) return false;
    if (filters.categoryType && row.categoryType !== filters.categoryType) return false;
    if (filters.supportCategory && row.supportCategory !== filters.supportCategory) return false;
    if (filters.product && row.product !== filters.product) return false;
    if (filters.assignee && row.assignee !== filters.assignee) return false;
    if (filters.requester && row.requester !== filters.requester) return false;
    if (filters.tseAgent && row.tseAgent !== filters.tseAgent) return false;

    if (filters.search) {
      const text = [
        row.ticketId,
        row.subject,
        row.description,
        row.status,
        row.region,
        row.categoryType,
        row.supportCategory,
        row.product,
        row.assignee,
        row.requester,
        row.tseAgent,
        row.tags,
      ]
        .join(" ")
        .toLowerCase();

      if (!text.includes(String(filters.search).toLowerCase())) return false;
    }

    return true;
  });
}

export function buildTicketAnalytics(rows = []) {
  const countBy = (key) => {
    const map = new Map();

    rows.forEach((row) => {
      const value = row[key] || "Unknown";
      map.set(value, (map.get(value) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  return {
    totalTickets: rows.length,
    openTickets: rows.filter((row) =>
      ["new", "open", "pending", "hold"].includes(row.status)
    ).length,
    solvedTickets: rows.filter((row) =>
      ["solved", "closed"].includes(row.status)
    ).length,
    rmaTickets: rows.filter((row) => row.categoryType === "RMA").length,

    byStatus: countBy("status"),
    byRegion: countBy("region"),
    byCategoryType: countBy("categoryType"),
    bySupportCategory: countBy("supportCategory"),
    byProduct: countBy("product"),
    byAssignee: countBy("assignee"),
    byRequester: countBy("requester"),
    byTseAgent: countBy("tseAgent"),
    byDate: countBy("date").sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    ),
  };
}

export function buildFilterOptions(rows = []) {
  const unique = (key) =>
    Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort();

  return {
    years: unique("year"),
    months: unique("month"),
    statuses: unique("status"),
    regions: unique("region"),
    categoryTypes: unique("categoryType"),
    supportCategories: unique("supportCategory"),
    products: unique("product"),
    assignees: unique("assignee"),
    requesters: unique("requester"),
    tseAgents: unique("tseAgent"),
  };
}