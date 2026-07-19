import crypto from "node:crypto";
import { promisify } from "node:util";
import express from "express";
import pg from "pg";

const { Pool } = pg;
const scrypt = promisify(crypto.scrypt);
const app = express();
const pool = new Pool();
const port = Number(process.env.PORT || 3000);
const sessionDays = Math.max(1, Math.min(90, Number(process.env.SESSION_DAYS || 30)));
const cookieSecure = process.env.COOKIE_SECURE === "true";
const allowedOrigin = process.env.AUTH_ORIGIN || "";
const sessionCookie = "atelier_session";
const loginAttempts = new Map();
const dummyPasswordHash = await createPasswordHash("canvas-atelier-dummy-password");

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" }));
app.use((request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use((request, response, next) => {
  if (!allowedOrigin || !["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return next();
  if (request.get("origin") === allowedOrigin) return next();
  return response.status(403).json({ error: "Request origin is not allowed." });
});

app.get("/api/health", async (_request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/session", async (request, response, next) => {
  try {
    const token = readCookie(request, sessionCookie);
    if (!token) return response.json({ user: null });
    const result = await pool.query(
      `SELECT users.id, users.email
       FROM auth_sessions
       JOIN users ON users.id = auth_sessions.user_id
       WHERE auth_sessions.token_hash = $1 AND auth_sessions.expires_at > NOW()`,
      [hashToken(token)]
    );
    return response.json({ user: result.rows[0] ?? null });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/register", authRateLimit, async (request, response, next) => {
  const email = normalizeEmail(request.body?.email);
  const password = request.body?.password;
  if (!email || !validPassword(password)) {
    return response.status(400).json({ error: "Use a valid email and a password of 10–128 characters." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const passwordHash = await createPasswordHash(password);
    const user = (await client.query(
      "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email",
      [crypto.randomUUID(), email, passwordHash]
    )).rows[0];
    const token = await createSession(client, user.id);
    await client.query("COMMIT");
    setSessionCookie(response, token);
    return response.status(201).json({ user });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return response.status(409).json({ error: "An account with this email already exists." });
    return next(error);
  } finally {
    client.release();
  }
});

app.post("/api/auth/login", authRateLimit, async (request, response, next) => {
  const email = normalizeEmail(request.body?.email);
  const password = request.body?.password;
  if (!email || typeof password !== "string") {
    return response.status(401).json({ error: "Email or password is incorrect." });
  }

  try {
    const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
    const record = result.rows[0];
    const valid = await verifyPassword(password, record?.password_hash ?? dummyPasswordHash);
    if (!record || !valid) return response.status(401).json({ error: "Email or password is incorrect." });
    const token = await createSession(pool, record.id);
    setSessionCookie(response, token);
    return response.json({ user: { id: record.id, email: record.email } });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/logout", async (request, response, next) => {
  try {
    const token = readCookie(request, sessionCookie);
    if (token) await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [hashToken(token)]);
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "The account service is temporarily unavailable." });
});

const server = app.listen(port, () => console.log(`Canvas Atelier API listening on ${port}`));

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}

async function createSession(database, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  await database.query(
    "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 day'))",
    [hashToken(token), userId, sessionDays]
  );
  return token;
}

function setSessionCookie(response, token) {
  response.cookie(sessionCookie, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: sessionDays * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookie, { httpOnly: true, secure: cookieSecure, sameSite: "lax", path: "/" });
}

function readCookie(request, name) {
  const prefix = `${name}=`;
  const value = String(request.headers.cookie ?? "").split(";").map(item => item.trim()).find(item => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derived).toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = String(storedHash).split(":");
  if (!salt || !/^[a-f0-9]{128}$/.test(expectedHex ?? "")) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, "hex");
  return crypto.timingSafeEqual(actual, expected);
}

function normalizeEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function validPassword(value) {
  return typeof value === "string" && value.length >= 10 && value.length <= 128;
}

function authRateLimit(request, response, next) {
  const now = Date.now();
  const key = request.ip;
  const recent = (loginAttempts.get(key) ?? []).filter(time => now - time < 15 * 60 * 1000);
  if (recent.length >= 20) return response.status(429).json({ error: "Too many account attempts. Try again later." });
  recent.push(now);
  loginAttempts.set(key, recent);
  next();
}
