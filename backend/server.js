require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const resumeRoutes = require("./routes/resume");
const adminRoutes = require("./routes/admin");

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendPath = path.join(__dirname, "..", "frontend");

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for beginner-friendly inline browser behavior; enable/tune before deployment.
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || `http://localhost:${port}`,
  credentials: true
}));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Too many authentication attempts. Wait a little and try again." } });
app.use("/api/auth", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok", service: "resume-builder-api" }));
app.use(express.static(frontendPath));
app.get("/{*path}", (req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API endpoint not found." });
  res.sendFile(path.join(frontendPath, "index.html"), err => { if (err) next(err); });
});

app.use((err, req, res, next) => {
  console.error("Request failed:", err?.message || "Unknown error");
  if (res.headersSent) return next(err);
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Request is too large." });
  res.status(500).json({ error: "Something went wrong on the server. Check the server terminal for details." });
});

app.listen(port, () => console.log(`ResumeCraft is running at http://localhost:${port}`));
