# edaten-auth

Plug-and-play JWT authentication router for **Express + MongoDB**.  
Just plug it in — register, login, refresh, logout out of the box.

---

## Install

```bash
npm install edaten-auth
```

---

## Requirements

- Express >= 4.0.0  
- Mongoose >= 7.0.0  
- cookie-parser (must be added to your app)  
- MongoDB connection must be established before using the library  

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

// IMPORTANT: connect MongoDB BEFORE using auth
await mongoose.connect(process.env.MONGO_URI);

app.use("/auth", createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["email"],
  loginField: "email",
}));

app.listen(3000);
```

---

## ⚠️ Important Notes (FIXED ISSUES)

### MongoDB connection issues

If you see errors like:

```
Operation users.insertOne() buffering timed out after 10000ms
```

It means MongoDB is not connected before routes are used.

### Fix:

Always ensure:

```js
await mongoose.connect(process.env.MONGO_URI);
```

runs BEFORE:

```js
app.use("/auth", createAuth(...))
```

---

## Options

| Option             | Type     | Required | Default                     | Description |
|--------------------|----------|----------|-----------------------------|-------------|
| jwtSecret          | string   | ✅        | —                           | Secret for access tokens |
| jwtRefreshSecret   | string   | ✅        | —                           | Secret for refresh tokens |
| requiredFields     | string[] | ❌        | []                          | Fields required on register |
| loginField         | string   | ❌        | "email"                     | Field used for login |
| isProduction       | boolean  | ❌        | NODE_ENV === "production"   | Cookie settings mode |
| cookieOptions      | object   | ❌        | {}                          | Override cookies |

---

## User Fields

| Field         | Type   | Unique |
|---------------|--------|--------|
| email         | string | ✅     |
| username      | string | ✅     |
| phonenumber   | string | ✅     |
| password      | string | —      |

---

## Endpoints

| Method | Path        | Description |
|--------|------------|-------------|
| POST   | /register  | Create user |
| POST   | /login     | Login user |
| POST   | /refresh   | Refresh token |
| POST   | /logout    | Logout user |

---

## How Login Works

Login uses one field defined in config:

- email
- username
- phonenumber

### Example request

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

or

```json
{
  "username": "john",
  "password": "123456"
}
```

or

```json
{
  "phonenumber": "+1234567890",
  "password": "123456"
}
```

---

## Examples

### Email login

```js
createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["email"],
  loginField: "email",
})
```

---

### Username login

```js
createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["username"],
  loginField: "username",
})
```

---

### Phone login

```js
createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["phonenumber"],
  loginField: "phonenumber",
})
```

---

## Response format

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "username": "john",
    "phonenumber": "+1234567890"
  },
  "accessToken": "eyJ..."
}
```

Refresh token is stored automatically in an httpOnly cookie.

---

## Protecting routes

```js
import { authMiddleware } from "edaten-auth/middleware";

app.get("/profile", authMiddleware(process.env.JWT_SECRET), (req, res) => {
  res.json({ user: req.user });
});
```

---

## Environment Variables

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
NODE_ENV=development
```

---

## Version

**Current stable version: 2.0.0**

Includes:
- fixed MongoDB connection timing issues  
- stable register/login flow  
- improved refresh + logout handling  
- peer dependency architecture  

---

## License

MIT