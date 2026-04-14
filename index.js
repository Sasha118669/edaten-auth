import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export default function createAuth(options = {}) {
  const {
    jwtSecret,
    jwtRefreshSecret,
    isProduction = process.env.NODE_ENV === "production",
    cookieOptions: customCookieOptions = {},
    requiredFields = ["email"],   
    loginField = "email",         
  } = options;

  if (!jwtSecret) throw new Error("[edaten-auth] jwtSecret is required");
  if (!jwtRefreshSecret) throw new Error("[edaten-auth] jwtRefreshSecret is required");

  // ===== User Schema (создаём внутри, чтобы requiredFields работал) =====
  const modelName = `User_${Date.now()}`;

  const userSchema = new mongoose.Schema(
    {
      email:    {
        type: String,
        unique: true,
        sparse: true,
        required: requiredFields.includes("email"),
      },
      username: {
        type: String,
        unique: true,
        sparse: true,
        required: requiredFields.includes("username"),
      },
      phone:    {
        type: String,
        unique: true,
        sparse: true,
        required: requiredFields.includes("phone"),
      },
      password: { type: String, required: true },
      refreshTokens: [{ type: String }],
    },
    { timestamps: true }
  );

  // Берём существующую модель или создаём новую
  const User = mongoose.models.User || mongoose.model("User", userSchema);

  // ===== Cookie Options =====
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    ...customCookieOptions,
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

  // ===== Хелпер: формируем объект юзера для ответа =====
  const formatUser = (user) => ({
    id: user._id,
    ...(user.email    && { email: user.email }),
    ...(user.username && { username: user.username }),
    ...(user.phone    && { phone: user.phone }),
  });

  const router = express.Router();

  // ===== REGISTER =====
  router.post("/register", async (req, res) => {
    const { email, username, phone, password } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        ...(email    && { email }),
        ...(username && { username }),
        ...(phone    && { phone }),
        password: hashedPassword,
      });

      const accessToken  = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshTokens.push(refreshToken);
      await user.save();

      res.cookie("refreshToken", refreshToken, cookieOptions);

      res.json({ user: formatUser(user), accessToken });
    } catch (error) {
      if (error.code === 11000) {
        // Определяем какое именно поле дублируется
        const field = Object.keys(error.keyPattern || {})[0] || "Field";
        return res.status(400).json({ message: `${field} already exists` });
      }
      res.status(400).json({ message: error.message });
    }
  });

  // ===== LOGIN =====
  router.post("/login", async (req, res) => {
    const { password } = req.body;
    const loginValue = req.body[loginField];

    if (!loginValue) {
      return res.status(400).json({ message: `${loginField} is required` });
    }

    try {
      const user = await User.findOne({ [loginField]: loginValue });
      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

      const accessToken  = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshTokens.push(refreshToken);
      await user.save();

      res.cookie("refreshToken", refreshToken, cookieOptions);

      res.json({ user: formatUser(user), accessToken });
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

      const newAccessToken  = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      user.refreshTokens.push(newRefreshToken);
      await user.save();

      res.cookie("refreshToken", newRefreshToken, cookieOptions);

      res.json({ user: formatUser(user), accessToken: newAccessToken });
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