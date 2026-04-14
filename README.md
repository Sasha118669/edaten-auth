# edaten-auth

Plug-and-play JWT authentication router for **Express + MongoDB**.  
Just plug it in — register, login, refresh, logout out of the box.

## Install

```bash
npm install edaten-auth
```

## Requirements

- Express >= 4.0.0
- Mongoose >= 7.0.0
- cookie-parser (must be added to your app)

```bash
npm install express mongoose cookie-parser
```

---

## Quick Start

```js
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import createAuth from "edaten-auth";

const app = express();
app.use(express.json());
app.use(cookieParser());

await mongoose.connect(process.env.MONGO_URI);

app.use("/auth", createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["email"],
  loginFields: ["email"],
}));

app.listen(3000);
```

---

## Options

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `jwtSecret` | string | ✅ | — | Secret for access tokens |
| `jwtRefreshSecret` | string | ✅ | — | Secret for refresh tokens |
| `requiredFields` | string[] | ❌ | `[]` | Fields required on registration (`"email"`, `"username"`, `"phone"`) |
| `loginFields` | string[] | ❌ | `["email"]` | Fields to search user by on login |
| `isProduction` | boolean | ❌ | `NODE_ENV === "production"` | Affects cookie settings |
| `cookieOptions` | object | ❌ | `{}` | Override default cookie options |

---

## User Fields

Every user can have these fields — you decide which are required and which are optional:

| Field | Type | Unique |
|---|---|---|
| `email` | string | ✅ |
| `username` | string | ✅ |
| `phone` | string | ✅ |
| `password` | string | — |

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create a new user |
| POST | `/login` | Login with password + any of `loginFields` |
| POST | `/refresh` | Get a new access token |
| POST | `/logout` | Logout and clear cookie |

---

## Examples

### Email only (default)
```js
createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["email"],
  loginFields: ["email"],
})
```
```json
// POST /register
{ "email": "user@example.com", "password": "..." }

// POST /login
{ "email": "user@example.com", "password": "..." }
```

---

### Messenger app — username + phone required, login by either
```js
createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["username", "phone"],
  loginFields: ["username", "phone"],
})
```
```json
// POST /register
{ "username": "john", "phone": "+1234567890", "password": "..." }

// POST /login — either works
{ "username": "john", "password": "..." }
{ "phone": "+1234567890", "password": "..." }
```

---

### Email required, username optional, login by either
```js
createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["email"],
  loginFields: ["email", "username"],
})
```
```json
// POST /register
{ "email": "user@example.com", "username": "john", "password": "..." }
{ "email": "user@example.com", "password": "..." } // username is optional

// POST /login — either works
{ "email": "user@example.com", "password": "..." }
{ "username": "john", "password": "..." }
```

---

## Response format

All endpoints return the same user object — only fields that exist on the user are included:

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "username": "john",
    "phone": "+1234567890"
  },
  "accessToken": "eyJ..."
}
```

Refresh token is set automatically as an **httpOnly cookie**.

---

## Protecting your routes

```js
import { authMiddleware } from "edaten-auth/middleware";

app.get("/profile", authMiddleware(process.env.JWT_SECRET), (req, res) => {
  res.json({ user: req.user });
});
```

---

## Environment Variables

Generate secure random secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Your `.env`:
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_generated_secret
JWT_REFRESH_SECRET=your_other_generated_secret
NODE_ENV=development

---

## License

MIT