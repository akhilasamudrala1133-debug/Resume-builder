const { authClient, db } = require("../supabase");

async function requireAuth(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || "resume_session";
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ error: "Please sign in to continue." });

    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "Your session has expired. Please sign in again." });

    const { data: profile, error: profileError } = await db
      .from("profiles").select("id, email, full_name, role").eq("id", data.user.id).maybeSingle();
    if (profileError) {
      console.error("Profile lookup failed:", profileError.message);
      return res.status(500).json({ error: "Could not load your account profile." });
    }
    if (!profile) return res.status(403).json({ error: "Your account profile is not ready. Contact the administrator." });
    req.user = { id: data.user.id, email: data.user.email, fullName: profile.full_name, role: profile.role };
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Administrator access is required." });
  next();
}

module.exports = { requireAuth, requireAdmin };
