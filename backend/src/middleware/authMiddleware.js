import { verifyToken } from "../services/authService.js";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized",
      });
    }

    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: "Invalid or expired token",
    });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        ok: false,
        message: "Forbidden",
      });
    }

    next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user?.permissions?.includes(permission)) {
      return res.status(403).json({
        ok: false,
        message: "Permission denied",
      });
    }

    next();
  };
}