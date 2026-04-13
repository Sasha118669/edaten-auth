import jwt from "jsonwebtoken";

// ===== AUTH MIDDLEWARE =====
// Используется в роутах пользователя для защиты эндпоинтов
// Пример: app.get("/profile", authMiddleware(jwtSecret), handler)

export function authMiddleware(jwtSecret) {
  if (!jwtSecret) throw new Error("[edaten-auth] jwtSecret is required");

  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded; // { id, email }
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}
