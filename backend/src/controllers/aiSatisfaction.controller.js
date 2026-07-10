import { analyzeSatisfactionWithAI } from "../services/aiSatisfaction.service.js";

export async function analyzeSatisfaction(req, res) {
  try {
    const analysis = await analyzeSatisfactionWithAI(req.body || {});

    return res.json({
      ok: true,
      success: true,
      message: "Satisfaction response analyzed successfully.",
      data: analysis,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      success: false,
      message: error.message || "AI satisfaction analysis failed",
    });
  }
}