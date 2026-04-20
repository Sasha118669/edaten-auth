Вот тебе **чистый README.md**, без лишних форматирований типа `id=""`, готовый чтобы просто **скопировать и вставить в файл** 👇

---

````md
# edaten-auth

Plug-and-play JWT authentication router for **Express + MongoDB**.  
Just plug it in — register, login, refresh, logout out of the box.

---

## Install

```bash
npm install edaten-auth
````

---

## Requirements

* Express >= 4.0.0
* Mongoose >= 7.0.0
* cookie-parser (must be added to your app)

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
  loginField: "email",
}));

app.listen(3000);
```

---

## Options

| Option             | Type     | Required | Default                     | Description                                                          |
| ------------------ | -------- | -------- | --------------------------- | -------------------------------------------------------------------- |
| `jwtSecret`        | string   | ✅        | —                           | Secret for access tokens                                             |
| `jwtRefreshSecret` | string   | ✅        | —                           | Secret for refresh tokens                                            |
| `requiredFields`   | string[] | ❌        | `[]`                        | Fields required on registration (`email`, `username`, `phonenumber`) |
| `loginField`       | string   | ❌        | `"email"`                   | Field used to find user on login                                     |
| `isProduction`     | boolean  | ❌        | `NODE_ENV === "production"` | Affects cookie settings                                              |
| `cookieOptions`    | object   | ❌        | `{}`                        | Override default cookie options                                      |

---

## User Fields

Every user can have these fields — you decide which are required:

| Field         | Type   | Unique |
| ------------- | ------ | ------ |
| `email`       | string | ✅      |
| `username`    | string | ✅      |
| `phonenumber` | string | ✅      |
| `password`    | string | —      |

---

## Endpoints

| Method | Path        | Description                       |
| ------ | ----------- | --------------------------------- |
| POST   | `/register` | Create a new user                 |
| POST   | `/login`    | Login using loginField + password |
| POST   | `/refresh`  | Get a new access token            |
| POST   | `/logout`   | Logout and clear cookie           |

---

## How Login Works

Login uses a single field defined in config:

* email
* username
* phonenumber

### Request format

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

```json
// POST /register
{ "email": "user@example.com", "password": "123456" }

// POST /login
{ "email": "user@example.com", "password": "123456" }
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

```json
// POST /register
{ "username": "john", "password": "123456" }

// POST /login
{ "username": "john", "password": "123456" }
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

```json
// POST /register
{ "phonenumber": "+1234567890", "password": "123456" }

// POST /login
{ "phonenumber": "+1234567890", "password": "123456" }
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

## License

MIT

