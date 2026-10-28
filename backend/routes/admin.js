const express = require("express");
const { db } = require("../supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/users", async (req, res, next) => {
  try {
    const { data, error } = await db.from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    res.json({ users: data || [] });
  } catch (err) { next(err); }
});

module.exports = router;
