import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// ===== User Schema =====
// Проверяем, не создана ли модель уже (важно при hot-reload)
const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    refreshTokens: [{ type: String }],
  },
  { timestamps: true }
);

const User =
  mongoose.models.User || mongoose.model("User", userSchema);

// ===== Главная функция =====
export default function createAuth(options = {}) {
  const {
    jwtSecret,
    jwtRefreshSecret,
    isProduction = process.env.NODE_ENV === "production",
    cookieOptions: customCookieOptions = {},
  } = options;

  if (!jwtSecret) throw new Error("[edaten-auth] jwtSecret is required");
  if (!jwtRefreshSecret) throw new Error("[edaten-auth] jwtRefreshSecret is required");

  // ===== Cookie Options =====
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    ...customCookieOptions, // пользователь может переопределить
  };

  // ===== JWT Helpers =====
  const generateAccessToken = (user) =>
    jwt.sign({ id: user._id, email: user.email }, jwtSecret, {
      expiresIn: "15m",
    });

  const generateRefreshToken = (user) =>
    jwt.sign({ id: user._id, email: user.email }, jwtRefreshSecret, {
      expiresIn: "30d",
    });

  const router = express.Router();

  // ===== REGISTER =====
  router.post("/register", async (req, res) => {
    const { email, password } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({ email, password: hashedPassword });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshTokens.push(refreshToken);
      await user.save();

      res.cookie("refreshToken", refreshToken, cookieOptions);

      res.json({
        user: { id: user._id, email: user.email },
        accessToken,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: "Email already exists" });
      }
      res.status(400).json({ message: error.message });
    }
  });

  // ===== LOGIN =====
  router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshTokens.push(refreshToken);
      await user.save();

      res.cookie("refreshToken", refreshToken, cookieOptions);

      res.json({
        user: { id: user._id, email: user.email },
        accessToken,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== REFRESH =====
  router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    try {
      const decoded = jwt.verify(refreshToken, jwtRefreshSecret);
      const user = await User.findById(decoded.id);

      if (!user || !user.refreshTokens.includes(refreshToken)) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      user.refreshTokens.push(newRefreshToken);
      await user.save();

      res.cookie("refreshToken", newRefreshToken, cookieOptions);

      res.json({
        accessToken: newAccessToken,
        user: { id: user._id, email: user.email },
      });
    } catch (error) {
      res.status(401).json({ message: "Invalid or expired refresh token" });
    }
  });

  // ===== LOGOUT =====
  router.post("/logout", async (req, res) => {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    try {
      await User.updateOne(
        { refreshTokens: refreshToken },
        { $pull: { refreshTokens: refreshToken } }
      );

      res.clearCookie("refreshToken");

      res.json({ message: "Logged out" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  return router;
}
