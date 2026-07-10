import OpenAI from "openai";

const ALLOWED_TEAMS = [
  "Support Team",
  "Backend Team",
  "RMA Team",
  "Product / Hardware Team",
  "Customer Feedback",
  "Unclear",
];

const ALLOWED_SENTIMENTS = ["Positive", "Negative", "Neutral", "Mixed"];

let openaiClient = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured on the backend.");
    error.statusCode = 500;
    throw error;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

function cleanText(value, maxLength = 6000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeResult(result) {
  const team = ALLOWED_TEAMS.includes(result?.team) ? result.team : "Unclear";
  const sentiment = ALLOWED_SENTIMENTS.includes(result?.sentiment)
    ? result.sentiment
    : "Neutral";

  let confidence = Number(result?.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    team,
    summary: cleanText(result?.summary, 800) || "No summary was returned.",
    sentiment,
    confidence,
    explanation:
      cleanText(result?.explanation, 1200) || "No explanation was returned.",
    recommendedAction:
      cleanText(result?.recommendedAction, 800) ||
      "Review the satisfaction response manually.",
    evidence: Array.isArray(result?.evidence)
      ? result.evidence.map((x) => cleanText(x, 300)).filter(Boolean).slice(0, 5)
      : [],
  };
}

export async function analyzeSatisfactionWithAI(input = {}) {
  const ticketId = cleanText(input.ticketId, 200) || "Unknown";
  const rating = cleanText(input.rating, 100) || "Unknown";
  const category = cleanText(input.category, 200) || "Unknown";
  const comment = cleanText(input.comment || input.comments);

  if (!comment) {
    const error = new Error("No satisfaction comment is available for AI analysis.");
    error.statusCode = 400;
    throw error;
  }

  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const response = await client.responses.create({
    model,
    instructions: `
You analyze customer satisfaction feedback for Atomos technical support operations.

Classify which team should primarily review or own the feedback.

Allowed team values:
- Support Team
- Backend Team
- RMA Team
- Product / Hardware Team
- Customer Feedback
- Unclear

Classification guidance:
- Support Team: agent communication, response speed, troubleshooting guidance, follow-up, service quality, unanswered messages.
- Backend Team: systems, portal, API, database, login, activation, internal system or synchronization failures.
- RMA Team: warranty, replacement, return, exchange, defective-unit replacement process, RMA delays.
- Product / Hardware Team: product defects, compatibility, physical hardware, SSD, storage cards, readers, cables, firmware or device behavior.
- Customer Feedback: general praise, thanks, broad satisfaction or dissatisfaction without an identifiable operational owner.
- Unclear: insufficient evidence.

Do not invent facts. Keep summary concise and operational.
Return only structured JSON.
    `.trim(),
    input: `
Ticket ID: ${ticketId}
Rating: ${rating}
Category: ${category}

Customer comment:
${comment}
    `.trim(),
    text: {
      format: {
        type: "json_schema",
        name: "satisfaction_ai_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            team: { type: "string", enum: ALLOWED_TEAMS },
            summary: { type: "string" },
            sentiment: { type: "string", enum: ALLOWED_SENTIMENTS },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            explanation: { type: "string" },
            recommendedAction: { type: "string" },
            evidence: {
              type: "array",
              items: { type: "string" },
              maxItems: 5,
            },
          },
          required: [
            "team",
            "summary",
            "sentiment",
            "confidence",
            "explanation",
            "recommendedAction",
            "evidence",
          ],
        },
      },
    },
  });

  if (!response.output_text) {
    throw new Error("AI returned an empty response.");
  }

  return {
    ...normalizeResult(JSON.parse(response.output_text)),
    model,
    responseId: response.id,
    analyzedAt: new Date().toISOString(),
  };
}