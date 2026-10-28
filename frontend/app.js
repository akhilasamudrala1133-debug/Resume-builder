const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const state = { mode: "signin", user: null, resume: null, dirty: false };
const emptyContent = () => ({
  personal: { fullName: "", headline: "", email: "", phone: "", location: "", linkedin: "", portfolio: "", summary: "" },
  education: [], skills: "", projects: [], experience: []
});

function showNotice(target, message, type = "") {
  target.textContent = message;
  target.className = `notice ${type}`.trim();
  target.classList.remove("hidden");
}
function hideNotice(target) { target.classList.add("hidden"); target.textContent = ""; }

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status}).`);
  return data;
}
function setAuthMode(mode) {
  state.mode = mode;
  const signup = mode === "signup";
  $("#signin-tab").classList.toggle("active", !signup);
  $("#signup-tab").classList.toggle("active", signup);
  $("#signin-tab").setAttribute("aria-selected", String(!signup));
  $("#signup-tab").setAttribute("aria-selected", String(signup));
  $("#name-label").classList.toggle("hidden", !signup);
  $("#auth-name").classList.toggle("hidden", !signup);
  $("#auth-name").required = signup;
  $("#auth-password").autocomplete = signup ? "new-password" : "current-password";
  $("#auth-heading").textContent = signup ? "Create your account" : "Welcome back";
  $("#auth-subheading").textContent = signup ? "Start building a resume that reflects you." : "Sign in to continue editing your resume.";
  $("#auth-submit").textContent = signup ? "Create account" : "Sign in";
  hideNotice($("#auth-message"));
}
function showView(view) {
  $("#auth-view").classList.toggle("hidden", view !== "auth");
  $("#app-view").classList.toggle("hidden", view !== "app");
  $("#admin-view").classList.toggle("hidden", view !== "admin");
  $("#logout-btn").classList.toggle("hidden", view === "auth");
  $("#user-label").textContent = state.user ? state.user.email : "";
}
function markDirty() {
  state.dirty = true;
  $("#save-state").textContent = "Unsaved changes";
}
function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
function addEntry(type, values = {}) {
  const template = $(`#${type}-template`);
  const item = template.content.firstElementChild.cloneNode(true);
  $$("[data-key]", item).forEach(input => { input.value = values[input.dataset.key] || ""; });
  $(".remove-item", item).addEventListener("click", () => {
    if (confirm("Remove this entry?")) { item.remove(); renderPreview(); markDirty(); }
  });
  $$("input, textarea", item).forEach(input => input.addEventListener("input", () => { renderPreview(); markDirty(); }));
  $(`#${type}-list`).append(item);
}
function readEntries(type) {
  return $$(`#${type}-list [data-item]`).map(item => {
    const obj = {};
    $$("[data-key]", item).forEach(input => obj[input.dataset.key] = input.value.trim());
    return obj;
  }).filter(obj => Object.values(obj).some(Boolean));
}
function collectForm() {
  const personal = {};
  ["fullName","headline","email","phone","location","linkedin","portfolio","summary"].forEach(key => personal[key] = $(`#${key}`).value.trim());
  return { personal, education: readEntries("education"), skills: $("#skills").value.trim(), projects: readEntries("projects"), experience: readEntries("experience") };
}
function setFieldValues(content) {
  const c = content || emptyContent();
  const p = c.personal || {};
  ["fullName","headline","email","phone","location","linkedin","portfolio","summary"].forEach(key => $(`#${key}`).value = p[key] || "");
  $("#skills").value = c.skills || "";
  ["education","projects","experience"].forEach(type => {
    $(`#${type}-list`).replaceChildren();
    (c[type] || []).forEach(item => addEntry(type, item));
  });
  renderPreview();
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function addText(parent, tag, className, text) {
  const node = el(tag, className, text);
  parent.append(node);
  return node;
}
function section(title) {
  const node = el("section", "resume-section");
  addText(node, "h3", "", title);
  return node;
}
function addLink(parent, label, rawUrl) {
  const href = safeExternalUrl(rawUrl);
  if (!href) { parent.append(el("span", "", label)); return; }
  const a = el("a", "", label); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; parent.append(a);
}
function renderPreview() {
  const data = collectForm();
  const p = data.personal;
  const paper = $("#resume-preview");
  paper.replaceChildren();
  const header = el("header", "resume-header");
  addText(header, "h1", "resume-name", p.fullName || "Your Name");
  if (p.headline) addText(header, "p", "resume-headline", p.headline);
  const contacts = el("div", "resume-contact");
  [p.email, p.phone, p.location].filter(Boolean).forEach(value => contacts.append(el("span", "", value)));
  if (p.linkedin) { contacts.append(el("span", "", "LinkedIn: ")); addLink(contacts, "Profile", p.linkedin); }
  if (p.portfolio) { contacts.append(el("span", "", "Portfolio: ")); addLink(contacts, "View", p.portfolio); }
  header.append(contacts); paper.append(header);
  if (p.summary) { const s = section("Profile"); addText(s, "p", "", p.summary); paper.append(s); }
  if (data.education.length) {
    const s = section("Education");
    data.education.forEach(e => {
      const entry = el("div", "resume-entry");
      addText(entry, "div", "resume-entry-top", e.institution);
      const sub = [e.degree, e.location].filter(Boolean).join(" · ");
      if (sub) addText(entry, "div", "resume-entry-sub", sub);
      const dates = [e.startYear, e.endYear].filter(Boolean).join(" – ");
      if (dates) addText(entry, "div", "resume-entry-sub", dates);
      if (e.details) addText(entry, "p", "", e.details);
      s.append(entry);
    }); paper.append(s);
  }
  if (data.skills) {
    const s = section("Skills"); const chips = el("div", "resume-skills");
    data.skills.split(",").map(x => x.trim()).filter(Boolean).forEach(skill => chips.append(el("span", "skill-chip", skill)));
    s.append(chips); paper.append(s);
  }
  if (data.projects.length) {
    const s = section("Projects");
    data.projects.forEach(pj => {
      const entry = el("div", "resume-entry");
      const top = el("div", "resume-entry-top"); addText(top, "span", "", pj.title);
      if (pj.url && safeExternalUrl(pj.url)) addLink(top, "Link ↗", pj.url);
      entry.append(top);
      if (pj.technologies) addText(entry, "div", "resume-entry-sub", pj.technologies);
      if (pj.description) addText(entry, "p", "", pj.description);
      s.append(entry);
    }); paper.append(s);
  }
  if (data.experience.length) {
    const s = section("Experience & Activities");
    data.experience.forEach(x => {
      const entry = el("div", "resume-entry");
      addText(entry, "div", "resume-entry-top", x.role);
      const sub = [x.organization, x.duration].filter(Boolean).join(" · ");
      if (sub) addText(entry, "div", "resume-entry-sub", sub);
      if (x.details) addText(entry, "p", "", x.details);
      s.append(entry);
    }); paper.append(s);
  }
  if (![p.summary, data.education.length, data.skills, data.projects.length, data.experience.length].some(Boolean)) {
    const empty = el("p", "muted", "Your education, skills, projects, and experience will appear here as you add them.");
    paper.append(empty);
  }
}
async function saveResume(event) {
  if (event) event.preventDefault();
  hideNotice($("#app-message"));
  const content = collectForm();
  if (content.personal.fullName.length < 2) {
    showNotice($("#app-message"), "Please enter your full name before saving.", "error");
    $("#fullName").focus(); return;
  }
  try {
    $("#save-btn").disabled = true;
    const result = await api("/api/resume", { method: "PUT", body: JSON.stringify(content) });
    state.resume = result.resume; state.dirty = false;
    $("#save-state").textContent = "Saved just now";
    showNotice($("#app-message"), "Your resume is saved securely to your account.", "success");
  } catch (err) {
    showNotice($("#app-message"), err.message, "error");
  } finally { $("#save-btn").disabled = false; }
}
async function loadResume() {
  const result = await api("/api/resume");
  state.resume = result.resume;
  setFieldValues(result.resume?.content || emptyContent());
  state.dirty = false;
  $("#save-state").textContent = result.resume ? `Last saved ${new Date(result.resume.updated_at).toLocaleString()}` : "Not saved yet";
}
async function showAdmin() {
  showView("admin");
  const result = await api("/api/admin/users");
  const wrap = $("#admin-table-wrap");
  wrap.replaceChildren();
  if (!result.users.length) { wrap.append(el("p", "muted", "No accounts yet.")); return; }
  const table = el("table");
  const thead = el("thead"); const tr = el("tr");
  ["Name", "Email", "Role", "Created"].forEach(label => tr.append(el("th", "", label)));
  thead.append(tr); table.append(thead);
  const tbody = el("tbody");
  result.users.forEach(user => {
    const row = el("tr");
    row.append(el("td", "", user.full_name || "—"), el("td", "", user.email), el("td", ""));
    row.children[2].append(el("span", "role-badge", user.role));
    row.append(el("td", "", new Date(user.created_at).toLocaleDateString()));
    tbody.append(row);
  });
  table.append(tbody); const tableWrap = el("div", "table-wrap"); tableWrap.append(table); wrap.append(tableWrap);
}
async function enterApp(user) {
  state.user = user;
  $("#user-label").textContent = user.email;
  if (user.role === "admin") {
    try { await showAdmin(); } catch (err) { showView("app"); await loadResume(); showNotice($("#app-message"), `Admin view could not load: ${err.message}`, "error"); }
  } else {
    showView("app");
    try { await loadResume(); } catch (err) { showNotice($("#app-message"), err.message, "error"); }
  }
}
async function checkSession() {
  try { const result = await api("/api/auth/me"); await enterApp(result.user); }
  catch { state.user = null; showView("auth"); }
}
$("#signin-tab").addEventListener("click", () => setAuthMode("signin"));
$("#signup-tab").addEventListener("click", () => setAuthMode("signup"));
$("#auth-form").addEventListener("submit", async event => {
  event.preventDefault(); hideNotice($("#auth-message"));
  const button = $("#auth-submit"); button.disabled = true;
  const payload = { email: $("#auth-email").value.trim(), password: $("#auth-password").value };
  if (state.mode === "signup") payload.fullName = $("#auth-name").value.trim();
  try {
    const result = await api(`/api/auth/${state.mode}`, { method: "POST", body: JSON.stringify(payload) });
    if (result.user) {
      $("#auth-password").value = "";
      await checkSession();
    } else {
      setAuthMode("signin");
      showNotice($("#auth-message"), result.message || "Account created. Follow the instructions sent to your email.", "success");
    }
  } catch (err) { showNotice($("#auth-message"), err.message, "error"); }
  finally { button.disabled = false; }
});
$("#logout-btn").addEventListener("click", async () => {
  try { await api("/api/auth/signout", { method: "POST", body: "{}" }); } catch {}
  state.user = null; showView("auth"); setAuthMode("signin");
});
$("#resume-form").addEventListener("submit", saveResume);
$("#save-btn").addEventListener("click", saveResume);
$("#print-btn").addEventListener("click", () => window.print());
$("#admin-refresh").addEventListener("click", async () => {
  try { await showAdmin(); } catch (err) { showNotice($("#app-message"), err.message, "error"); }
});
$$("[data-add]").forEach(button => button.addEventListener("click", () => {
  addEntry(button.dataset.add);
  renderPreview(); markDirty();
}));
$$("#resume-form > details input, #resume-form > details textarea").forEach(input => input.addEventListener("input", () => { renderPreview(); markDirty(); }));
window.addEventListener("beforeunload", event => { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
setAuthMode("signin");
checkSession();
