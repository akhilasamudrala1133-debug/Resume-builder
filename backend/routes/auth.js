const express = require("express");
const { authClient, db } = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function cleanText(value, max = 100) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function setSessionCookie(res, token) {
  res.cookie(process.env.COOKIE_NAME || "resume_session", token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 1000 * 60 * 60 * 8
  });
}

router.post("/signup", async (req, res, next) => {
  try {
    const fullName = cleanText(req.body?.fullName, 100);
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (fullName.length < 2) return res.status(400).json({ error: "Enter your full name (at least 2 characters)." });
    if (!emailPattern.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Password must contain 8–128 characters." });

    const { data, error } = await authClient.auth.signUp({
      email, password, options: { data: { full_name: fullName } }
    });
    if (error) {
      const status = /already registered|already exists/i.test(error.message) ? 409 : 400;
      return res.status(status).json({ error: status === 409 ? "An account with this email already exists." : "Could not create the account. Check your details and Supabase Auth settings." });
    }
    if (!data.user) return res.status(400).json({ error: "Account creation was not completed." });
    if (!data.session?.access_token) {
      return res.status(201).json({ message: "Account created. Check your email to confirm it, then sign in." });
    }
    setSessionCookie(res, data.session.access_token);
    return res.status(201).json({ message: "Account created successfully.", user: { email: data.user.email, fullName } });
  } catch (err) { next(err); }
});

router.post("/signin", async (req, res, next) => {
  try {
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!emailPattern.test(email) || !password) return res.status(400).json({ error: "Enter a valid email and password." });
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.session?.access_token) return res.status(401).json({ error: "Email or password is incorrect, or the email needs confirmation." });
    setSessionCookie(res, data.session.access_token);
    return res.json({ message: "Signed in successfully.", user: { email: data.user.email } });
  } catch (err) { next(err); }
});

router.post("/signout", (req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || "resume_session", {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/"
  });
  res.json({ message: "Signed out." });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email, fullName: req.user.fullName, role: req.user.role } });
});

module.exports = router;
