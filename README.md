# ResumeCraft — Student Resume Builder

ResumeCraft is a beginner-friendly full-stack web application for students and fresh graduates to create, preview, save, and print a structured resume. It is designed as a college MVP using plain HTML, CSS, Vanilla JavaScript, Node.js, Express, and Supabase PostgreSQL.

## 1. Problem and objectives

Students often do not know which resume sections to include or how to arrange their information. ResumeCraft guides them through personal details, education, skills, projects, and experience/activities, then renders a live resume preview that can be printed or saved as PDF.

### Target users and roles
- **User:** creates an account and can view, edit, save, and delete their own resume.
- **Admin:** can view a limited list of registered account profiles (name, email, role, created date). Admin cannot view users' resume contents through the admin screen.

### Features
- Sign up, sign in, and sign out using Supabase Auth.
- Server-managed, HttpOnly session cookie.
- Guided resume editor with repeatable education, project, and experience sections.
- Live preview and browser print / Save as PDF.
- Persistent PostgreSQL storage.
- Backend validation, authentication, ownership checks, rate-limited auth routes, and admin-only account overview.
- Responsive layout for desktop, tablet, and mobile.

## 2. Technology stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js 20+ and Express 5
- Database/authentication: Supabase PostgreSQL and Supabase Auth
- Minimal npm packages: Supabase JS client, Express, cookie-parser, cors, dotenv, express-rate-limit, helmet

## 3. Folder structure

```text
resume-builder/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── resume.js
│   │   └── admin.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

A local `backend/.env` is created by you and is intentionally not committed.

## 4. Prerequisites

Install:
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js LTS (includes npm)](https://nodejs.org/)
- [Git](https://git-scm.com/downloads)
- A free [Supabase](https://supabase.com/) account
- A [GitHub](https://github.com/) account to publish your source code

Check versions in a new VS Code terminal:
```bash
node --version
npm --version
git --version
```
Use Node.js 20 or newer.

## 5. Create and configure Supabase

1. Sign in to Supabase and create a new project. Save its database password privately; this app does not need that password in `.env`.
2. In the project dashboard, open **SQL Editor → New query**.
3. Copy all of `database/schema.sql` into the editor and click **Run**.
4. Open **Table Editor** and confirm `profiles` and `resumes` exist.
5. Open **Project Settings → API** (the label may vary by dashboard version). Copy the Project URL, publishable/anon key, and service-role/secret key. The service-role key is a secret and belongs only in the backend `.env`.
6. In **Authentication → Providers / Sign In**, enable Email. For a classroom demo, you can turn email confirmation off in the Supabase Auth settings; otherwise, users must confirm their email before signing in. Prefer confirmation in a real deployment.
7. Check the email confirmation setting before testing registration. If confirmation is on, the app will tell users to check their email.

### Set up the requested admin account

Supabase Auth accounts are not created by the SQL schema. Create the admin account through the app's **Create account** tab with the requested email `mrec@gmail.com`. Use the requested initial password `MREC@123` only if this is a controlled classroom demo, and change it immediately to a strong, unique password before any public deployment. If the email already has an account, sign in to that account instead.

After the account exists and its profile appears, open **SQL Editor** and run:
```sql
update public.profiles
set role = 'admin'
where email = 'mrec@gmail.com';
```
Verify with:
```sql
select email, role from public.profiles where email = 'mrec@gmail.com';
```
The role should show `admin`. Role changes are deliberately not available from the browser. If the account was created with email confirmation enabled, confirm the email first. Do not put the admin password in source code, SQL, README, or GitHub.

## 6. Environment variables

From the project root, copy the example file:

**Windows PowerShell**
```powershell
Copy-Item backend/.env.example backend/.env
```

**macOS / Linux**
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and replace the placeholders:
```dotenv
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
CLIENT_ORIGIN=http://localhost:3000
COOKIE_NAME=resume_session
```

- `SUPABASE_URL`: project URL from Supabase.
- `SUPABASE_ANON_KEY`: publishable/anon key used for Auth operations.
- `SUPABASE_SERVICE_ROLE_KEY`: privileged server-only key for database queries. Never place it in frontend files or commit it.
- `CLIENT_ORIGIN`: origin allowed by Express CORS. For this single-origin setup, keep it at `http://localhost:3000`.
- `COOKIE_NAME`: name of the HttpOnly session cookie.

`.env.example` contains placeholder values and is safe to commit. `.env` contains your actual credentials and must stay private. If a secret is ever committed, removing the file is not enough: rotate the credential in Supabase and clean repository history.

## 7. Install and run

Open VS Code → **File → Open Folder** → select `resume-builder`. Then choose **Terminal → New Terminal**.

From the project root:
```bash
cd backend
npm install
npm run check
npm start
```
Expected startup message:
```text
ResumeCraft is running at http://localhost:3000
```
Open `http://localhost:3000` in your browser. Do not open `frontend/index.html` directly as a `file://` URL; the Express server serves the frontend and API from one origin.

To stop the server, focus the terminal and press `Ctrl+C`. During development, use `npm run dev` to restart the server when backend files change.

## 8. How the application works

1. The browser sends sign-up/sign-in requests to Express.
2. Supabase Auth validates credentials and returns an access token.
3. Express stores the token in an HttpOnly, SameSite cookie (JavaScript cannot read it).
4. For private routes, Express validates the token with Supabase Auth, loads the profile, and checks the role.
5. Resume data is stored as validated JSONB in `public.resumes`, one row per user.
6. The backend filters resume operations by the authenticated user's verified ID. Admin endpoints require the database profile role `admin`.

The database has Row Level Security enabled and intentionally has no direct client policies. This app accesses tables through the server-only service-role client; therefore, backend authentication, role checks, and ownership filters are critical. Do not expose the service-role key. Before production deployment, add a stricter Content Security Policy, HTTPS, monitoring, backups, and review the Supabase security configuration.

## 9. API reference

All responses are JSON. Private endpoints use the `resume_session` HttpOnly cookie by default.

| Method | Endpoint | Purpose | Access | Typical success |
|---|---|---|---|---|
| GET | `/api/health` | Health check | Public | `{"status":"ok","service":"resume-builder-api"}` |
| POST | `/api/auth/signup` | Create account | Public; rate limited | 201 with message/user or confirmation message |
| POST | `/api/auth/signin` | Sign in | Public; rate limited | 200 with message/user and cookie |
| POST | `/api/auth/signout` | Clear session cookie | Public | `{"message":"Signed out."}` |
| GET | `/api/auth/me` | Current account | Signed in | `{"user":{"id":"…","email":"…","fullName":"…","role":"user"}}` |
| GET | `/api/resume` | Get current user's resume | Signed in | `{"resume":null}` or resume object |
| PUT | `/api/resume` | Create/update current user's resume | Signed in | `{"message":"Resume saved.","resume":{…}}` |
| DELETE | `/api/resume` | Delete current user's resume | Signed in | `{"message":"Resume deleted."}` |
| GET | `/api/admin/users` | List up to 200 account profiles | Admin only | `{"users":[…]}` |

`PUT /api/resume` body shape:
```json
{
  "personal": {
    "fullName": "Asha Rao",
    "headline": "B.Tech Computer Science Student",
    "email": "asha@example.com",
    "phone": "+91 98765 43210",
    "location": "Hyderabad, India",
    "linkedin": "https://linkedin.com/in/asha",
    "portfolio": "https://github.com/asha",
    "summary": "Student interested in building useful web applications."
  },
  "education": [],
  "skills": "HTML, CSS, JavaScript",
  "projects": [],
  "experience": []
}
```
Education, projects, and experience entries are arrays. Each array is limited to 12 entries. Strings are trimmed and capped in length by the backend.

Errors use suitable HTTP codes: 400 invalid input, 401 missing/invalid session, 403 insufficient role, 404 unknown API route, 409 duplicate email where detected, 413 oversized request, and 500 unexpected server/database errors. Internal database details are logged only in the server terminal and are not returned to the browser.

## 10. Use the application

1. Create an account with your name, email, and password.
2. If email confirmation is enabled, confirm your email and then sign in.
3. Add personal details, education, skills, projects, and activities.
4. Watch the preview update as you type.
5. Select **Save resume**. Sign out and sign back in to verify that the saved data persists.
6. Select **Print / Save PDF**. In the print dialog, choose a printer or **Save as PDF**.
7. The admin account sees an account overview after its role has been promoted in SQL.

## 11. Testing checklist

- [ ] `GET http://localhost:3000/api/health` returns status `ok`.
- [ ] New account can register when Supabase Email Auth settings permit it.
- [ ] Duplicate email is rejected with a useful message.
- [ ] Incorrect password fails without creating a session.
- [ ] Signing in creates a session cookie; signing out clears it.
- [ ] Visiting `/api/resume` without a session returns 401.
- [ ] Resume saves to PostgreSQL and is restored after signing out/in.
- [ ] Empty full name is rejected by browser and backend validation.
- [ ] Invalid contact email and malformed links are rejected on save.
- [ ] Add/remove education, project, and experience entries; preview updates.
- [ ] User A cannot retrieve or modify User B's resume (the API always filters by verified user ID).
- [ ] A normal user calling `/api/admin/users` receives 403.
- [ ] The admin account can see the account list, but not resume content.
- [ ] Print preview fits an A4 page reasonably; test desktop and mobile widths.
- [ ] Stop Supabase/network temporarily and confirm the UI shows an error rather than claiming data saved.

Quick manual health check from a second terminal:
```bash
curl http://localhost:3000/api/health
```
This project includes a Node syntax-check script:
```bash
cd backend
npm run check
```
Syntax checks do not prove that your Supabase credentials, Auth settings, database schema, or browser workflows are configured correctly; complete the manual checklist after setup.

## 12. Troubleshooting

- **Missing environment variable:** ensure `backend/.env` exists and values are filled without surrounding quote mistakes. Restart Node after editing.
- **Invalid API key / project URL:** copy the URL and keys from the same Supabase project.
- **Profile is not ready:** confirm that `database/schema.sql` ran successfully and that the profile trigger exists. Check `public.profiles` for the Auth user.
- **Sign-up says confirmation is needed:** check the inbox/spam folder, or change the Email confirmation setting for a local classroom demo.
- **Login fails after sign-up:** confirm the email if required, check the email/password, and verify that the account exists in Supabase Authentication.
- **Admin page returns 403:** sign in as `mrec@gmail.com`, then run the role-promotion SQL and verify `role = 'admin'`.
- **CORS errors:** keep the browser at `http://localhost:3000` and set `CLIENT_ORIGIN=http://localhost:3000`.
- **Port already in use:** change `PORT` in `.env` to another free port and update `CLIENT_ORIGIN` to match.
- **Database/table error:** run the complete schema in Supabase SQL Editor and inspect the SQL Editor output.
- **Frontend looks stale:** hard-refresh with `Ctrl+F5`.
- **npm install errors:** check Node/npm versions, network connection, then rerun `npm install` from `backend/`.

## 13. GitHub upload

1. Create an empty repository on GitHub. Do not add a README there if you already have this local README.
2. From the project root, run:
```bash
git init
git status
git add .
git status
git commit -m "Build ResumeCraft project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```
Replace `YOUR_GITHUB_REPOSITORY_URL` with the repository URL shown by GitHub. If Git says `remote origin already exists`, use `git remote set-url origin YOUR_GITHUB_REPOSITORY_URL`.

Before committing, confirm:
- `backend/.env` and all real secrets are absent from the staged files.
- `node_modules/` is excluded.
- `.env.example` is included.
- No passwords, database exports, or private user data are committed.

`.gitignore` does not erase secrets already committed. If you accidentally push a secret, rotate it immediately and remove it from repository history.

## 14. Limitations and future improvements

- This MVP stores one resume per account and offers a single print-friendly layout.
- No hosted deployment, email delivery service, resume templates, file uploads, or automated browser tests are included.
- Supabase Auth confirmation behavior depends on project settings.
- Before public deployment: require HTTPS, set `NODE_ENV=production`, set `CLIENT_ORIGIN` to the real site origin, review cookie and CORS settings, configure a strict Content Security Policy, rotate demo credentials, test backups, and perform a security review.
