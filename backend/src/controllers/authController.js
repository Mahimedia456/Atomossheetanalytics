import { loginUser } from "../services/authService.js";

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Email and password are required",
      });
    }

    const data = await loginUser({ email, password });

    return res.json({
      ok: true,
      message: "Login successful",
      ...data,
    });
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: error.message || "Login failed",
    });
  }
}

export async function me(req, res) {
  return res.json({
    ok: true,
    user: req.user,
  });
}