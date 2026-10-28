const express = require("express");
const { db } = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();
router.use(requireAuth);

const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const arr = (value, maxItems, fields) => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(item => {
    const clean = {};
    for (const [key, max] of Object.entries(fields)) clean[key] = text(item?.[key], max);
    return clean;
  }).filter(item => Object.values(item).some(Boolean));
};
function validateAndClean(body) {
  const fullName = text(body?.personal?.fullName, 100);
  if (fullName.length < 2) return { error: "Full name is required (at least 2 characters)." };
  const personal = {
    fullName, headline: text(body.personal.headline, 120),
    email: text(body.personal.email, 254), phone: text(body.personal.phone, 30),
    location: text(body.personal.location, 100), linkedin: text(body.personal.linkedin, 300),
    portfolio: text(body.personal.portfolio, 300), summary: text(body.personal.summary, 1200)
  };
  if (personal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) return { error: "Contact email is not valid." };
  for (const key of ["linkedin", "portfolio"]) {
    if (personal[key] && !/^https?:\/\/\S+$/i.test(personal[key])) return { error: `${key === "linkedin" ? "LinkedIn" : "Portfolio"} must start with http:// or https://.` };
  }
  const education = arr(body.education, 12, { institution: 180, degree: 120, location: 100, startYear: 20, endYear: 20, details: 500 });
  const projects = arr(body.projects, 12, { title: 180, description: 1000, technologies: 300, url: 300 });
  const experience = arr(body.experience, 12, { role: 150, organization: 180, duration: 80, details: 800 });
  if (education.some(e => !e.institution)) return { error: "Each education entry needs an institution name." };
  if (projects.some(p => !p.title)) return { error: "Each project entry needs a title." };
  if (experience.some(e => !e.role)) return { error: "Each experience entry needs a role or activity." };
  for (const p of projects) if (p.url && !/^https?:\/\/\S+$/i.test(p.url)) return { error: "Project URLs must start with http:// or https://." };
  return { clean: { personal, education, skills: text(body.skills, 1500), projects, experience } };
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await db.from("resumes").select("id, content, created_at, updated_at")
      .eq("user_id", req.user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    res.json({ resume: data || null });
  } catch (err) { next(err); }
});

router.put("/", async (req, res, next) => {
  try {
    const result = validateAndClean(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    const { data: existing, error: readError } = await db.from("resumes").select("id")
      .eq("user_id", req.user.id).maybeSingle();
    if (readError) throw readError;
    let query;
    if (existing) {
      query = await db.from("resumes").update({ content: result.clean, updated_at: new Date().toISOString() })
        .eq("id", existing.id).eq("user_id", req.user.id).select("id, content, created_at, updated_at").single();
    } else {
      query = await db.from("resumes").insert({ user_id: req.user.id, content: result.clean })
        .select("id, content, created_at, updated_at").single();
    }
    if (query.error) throw query.error;
    res.json({ message: "Resume saved.", resume: query.data });
  } catch (err) { next(err); }
});

router.delete("/", async (req, res, next) => {
  try {
    const { error } = await db.from("resumes").delete().eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Resume deleted." });
  } catch (err) { next(err); }
});

module.exports = router;
