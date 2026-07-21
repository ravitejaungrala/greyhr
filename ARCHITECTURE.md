# HRMS Platform — End-to-End Architecture

> Generated 2026-07-20. Reflects the state of the `main` working tree.

---

## 1. What this is

A multi-tenant HR management system for **NeuzenAI IT Solutions**, covering the full employee lifecycle: onboarding with face enrollment, attendance, leave, payroll/payslips, equipment requests, peer recognition, AI-generated HR documents (offer/relieving/experience letters), and two Claude-powered assistants (one for admins, one for employees).

Deployed as a **React SPA on AWS Amplify** talking to a **FastAPI monolith running as a container-image Lambda** behind a Function URL, backed by **MongoDB Atlas**, **S3**, and **Chroma Cloud**.

---

## 2. Repository layout

```
hrms_platform/
├── apps/
│   ├── backend/          FastAPI + Mangum → AWS Lambda (Docker, ECR)
│   │   ├── main.py               ASGI app, 57 lines
│   │   ├── api/
│   │   │   ├── router.py         ⚠ 5,185 lines — the entire monolith
│   │   │   ├── enhanced_doc_system.py   current document pipeline (504)
│   │   │   ├── doc_engine.py     Jinja2 + Claude template engine (275)
│   │   │   ├── doc_config.py     document field registry (113)
│   │   │   ├── admin_agent.py    RAG copilot over Chroma (335)
│   │   │   ├── employee_agent.py tool-calling agent (275)
│   │   │   ├── *_agent_prompt.py system prompts
│   │   │   └── email_utils.py    Gmail SMTP + HTML emails (283)
│   │   ├── database/     mongo_client.py, s3_client.py, vector_client.py (dead)
│   │   ├── templates/    6 Jinja2 HTML letter templates
│   │   └── ~49 loose debug/one-off scripts  ⚠
│   └── frontend/         React 18 + Vite 5, plain JSX
│       └── src/
│           ├── App.jsx           router + sidebar + auth (369)
│           ├── config.js         one line: API_URL
│           ├── pages/            15 live pages
│           │   └── AdminDashboard.jsx  ⚠ 4,512 lines — 13 tabs in one component
│           └── components/       3 document generators + dead UI layer
├── .github/workflows/deploy.yml  backend → ECR → Lambda (main branch)
├── amplify.yml                   frontend → Amplify
└── 8 stale *.md session reports  ⚠
```

**Scale:** ~7,400 LOC backend application code, ~18,900 LOC frontend. Two files account for a quarter of the codebase.

---

## 3. Runtime architecture

```
Browser (Amplify SPA)
   │  fetch/axios, ~105 hand-rolled call sites, no auth header
   ▼
Lambda Function URL (ap-south-1)
   │
FastAPI app  (Mangum, lifespan="off")
   ├── /api/*            router.py           — everything
   └── /api/enhanced-docs/*, /historical-docs/*  enhanced_doc_system.py
   │
   ├──► MongoDB Atlas       users, leaves, attendance, holidays, …
   ├──► S3                  photos, documents, templates, drafts
   ├──► Chroma Cloud        employee + leave embeddings (admin RAG)
   ├──► Anthropic API       claude-opus-4-8
   └──► Gmail SMTP          approval emails with one-click action links
```

### Deployment
| | Trigger | Target |
|---|---|---|
| Backend | push to `main` touching `apps/backend/**` | Docker → ECR `dhanadurga-hrms` → `lambda update-function-code` |
| Frontend | Amplify auto-build | `npm ci && npm run build` → `dist/` |

No test step, no lint gate, no staging environment, no rollback path. **There is no CI for the frontend at all.**

---

## 4. Data model (MongoDB, schemaless)

`users` is a god-document holding identity, credentials, KYC, education, prior experience, bank details, S3 keys for every uploaded artifact, salary configuration, leave accrual rates, and generated-document pointers — roughly 50 top-level fields.

Other collections: `leaves`, `attendance`, `holidays`, `workday_overrides`, `comp_off_requests`, `weekend_work_requests`, `item_requests`, `payslip_releases`, `kudos`, `announcements`, `praises`, `notifications`, `settings`, `templates`, `offer_letter_templates`, `historical_employees`, `items`.

**Multi-tenancy** is derived from the **email domain** — `normalize_company_key()` takes the part after `@` and scopes queries with `$or: [{company_key}, {email: /@domain$/}]`. The super-admin email bypasses all scoping.

### Known schema-drift bugs
| Issue | Written at | Read at |
|---|---|---|
| Leave accrual rates nested vs. flat | `router.py:1050` (`leave_rates.privilege`) | `router.py:3372` (`privilege_leave_rate`) → admin-set rates silently ignored |
| Bank IFSC field name | `router.py:1013` (`ifsc_code`) | `router.py:605` (`ifsc`) |
| Chat-requested items | `employee_agent.py:135` (`items`) | `router.py:1773` (`item_requests`) → invisible to admins |
| Offer-letter templates | `router.py:1284` (`templates`) | `router.py:4791` (`offer_letter_templates`) → split-brain storage |

Attendance timestamps are stored as **ISO strings** and queried with `$regex: "^YYYY-MM"` — non-indexable collection scans on every attendance, calendar, and payroll read.

---

## 5. Feature domains

### Authentication & onboarding
Admin creates the employee → employee logs in with `status: incomplete_profile` → multi-step wizard collects DOB, family, bank, PAN/PF/UAN, education certificates, prior experience → **face enrollment with MediaPipe liveness** (left/right head-turn challenge, three captures) → admin approves and sets salary, employment type, role, and per-employee leave rates → `status: approved`.

Self-registration was deliberately removed (see `SIGNUP_REMOVAL_IMPLEMENTATION.md`); the route is commented out at `router.py:468-499`.

### Attendance
`POST /attendance/scan` records sign-in/sign-out with a face image to S3. `GET /employee/attendance/calendar` (~340 lines, `router.py:2681`) is the core state machine, reconciling attendance, holidays, workday overrides, weekend-work requests, approved leave, and LOP.

### Leave
Apply → email to approver with **one-click approve/reject links** → status update → write-through sync of the leave record into Chroma so the admin copilot can answer questions about it. Balances are **computed on read**, month-by-month from joining date, on every call. `/admin/leaves` calls that per leave record — O(leaves × months) with N+1 Mongo reads.

### Payroll
Company-wide salary settings in `settings.company_salary_config`; per-employee overrides on the user doc. Payslips are gated behind a monthly `payslip_releases` flag. PDFs are generated three different ways (FPDF2 hand-layout, xhtml2pdf from Jinja2, and the enhanced-docs pipeline).

### Documents — three overlapping generations
1. **Legacy** `/generate-doc/*` — `doc_engine.py`, Claude extracts fields, Jinja2 renders.
2. **Offer-letter specific** `/admin/interns/*` — inline Jinja2 + xhtml2pdf, e-signature flow.
3. **Current** `/enhanced-docs/*` — `doc_config.py` field registry → prefill from user doc → preview → generate HTML to S3 → convert to PDF at download time. Plus `/historical-docs/*` for people never in `users`.

Six templates in `templates/`: `full_time_offer.html` (4,154 lines), `internship_offer`, `internship_completion`, `experience`, `relieving`, `payslip`. Salary splits are hardcoded heuristics — basic 40%, HRA 30%, special 30%, PF 12%, tax 10%, prof tax ₹200 (`enhanced_doc_system.py:149-171`).

### AI
| | Admin copilot | Employee assistant |
|---|---|---|
| Endpoint | `POST /admin/copilot` | `POST /employee/chat` |
| Pattern | **RAG** — Chroma query (25–50 results) → context → single Claude call | **Tool calling** — 5 tools, agent loop |
| Identity | none (unscoped by tenant) | `ContextVar` — tools read employee ID from context, never from LLM args ✅ |
| Memory | stateless | `self.history` exists but the agent is re-instantiated per request → **discarded every turn** |

The employee agent's ContextVar identity model is the strongest security design in the codebase. Its tools re-enter `router.py` via function-local imports to dodge a circular dependency.

`/copilot/ask` is a RAG endpoint with retrieval hardcoded off (`router.py:2611`) — effectively a bare Claude passthrough, superseded by `/employee/chat`.

---

## 6. Critical findings

### 6.1 There is no authentication

This is the finding that subsumes everything else.

- **No JWT, no session, no password hashing.** Grep for `jwt|bcrypt|passlib|HTTPBearer|OAuth2|Depends(` across the backend returns **zero matches**.
- **Hardcoded super-admin credentials in source** — `router.py:296-297`.
- **Plaintext passwords** stored (`router.py:993`, comment: *"Plain text for MVP"*), compared (`router.py:519`), and **echoed back in the API response** (`router.py:1095`).
- `/auth/login` returns a plain user object. No token is issued or expected.
- The frontend stores that object in `sessionStorage`. Setting `sessionStorage.setItem('user', '{"role":"super_admin",...}')` in DevTools mounts the full admin UI **and its API calls succeed**.
- Identity and tenancy ride on **client-supplied query params** — `?admin_email=` and `?employee_id=`. Omitting `admin_email` on `/admin/leaves` yields an empty query → all companies, all employees.

**Every `/admin/*` endpoint is callable by anyone with the URL.**

### 6.2 Other security issues

| Severity | Issue | Location |
|---|---|---|
| High | Approve-by-URL, unauthenticated GET, 8-hex guessable IDs — link prefetchers can trigger approvals | `router.py:1596, 1801` |
| High | `/praise/employees` returns every field of every user, **including passwords**, unauthenticated | `router.py:5125` |
| High | Unauthenticated arbitrary-S3-key proxy | `router.py:2332` |
| High | Path traversal — `filename` interpolated straight into the S3 key | `enhanced_doc_system.py:482` |
| Medium | Unauthenticated `DELETE /admin/notifications` wipes the collection | `router.py:4450` |
| Medium | `allow_origins=["*"]` + `allow_credentials=True` | `main.py:22-24` |
| Medium | `apps/frontend/.env` committed to git; production Lambda URL in a comment | — |
| Medium | Two real signed offer-letter PDFs with employee names committed | `apps/backend/*.pdf` |

### 6.3 Live functional bugs

**`EmployeeSignatureRequest` is defined three times** (`router.py:1252`, `4376`). The final definition adds required `sender_name`, `receiver_name`, `message` — kudos fields pasted into the wrong class. Because `submit_offer_signature` is declared at line 4878, **`POST /employee/submit-offer-signature` now rejects valid requests** unless three unrelated kudos fields are supplied.

Correspondingly, **`KudosRequest` (`router.py:4373`) has only `sender_id`** — its real fields were moved into the signature class. `POST /employee/kudos` persists records with no recipient and no message, while `GET /employee/kudos` reads exactly those fields.

Also:
- **Employee agent loop has no iteration cap** (`employee_agent.py:207`) — unbounded `while True`.
- `Notification.created_at` default evaluated once at import (`router.py:1176`) — every notification gets the cold-start timestamp.
- `/employee/salary/statement/excel` returns CSV with a `.csv` filename.
- `s3_db.s3_client` is never assigned in mock mode, but `router.py:1317` calls `.delete_object` on it → `AttributeError` locally.
- Employee prompt hardcodes *"the current date (**April 2026**)"* (`employee_agent_prompt.py:26`) — stale, and the model uses it to resolve relative months.
- `EngageModule.jsx:69-72` — lazy initializer passed as the second `useState` arg, storing the function itself as state.
- `EngageModule.jsx:58-66` — hardcoded roster of real named employees as fallback data.
- `MyWorkLife.jsx:39-46` — no-op PATCH with an empty body and a comment admitting it's wrong.

### 6.4 Duplicate route registrations (later one silently dead)

`enhanced_router` is included **twice** (`main.py:34` and `router.py:4550`), duplicating 10 routes in the OpenAPI spec. Additionally:

| Path | Live | Dead |
|---|---|---|
| `GET /employee/leaves` | 1541 | 3299 |
| `POST /admin/templates/analyze` | 1257 | 5065 |
| `POST /admin/templates/upload` | 1273 | 5075 |
| `GET /admin/templates` | 1300 | 5100 |
| `DELETE /admin/templates/{...}` | 1308 | 5108 |

The dead template block is what writes to `offer_letter_templates` — the collection the offer-letter generator reads from. The live block writes to `templates`. Template upload and template use are wired to different stores.

---

## 7. Structural debt

**Backend**
- `router.py` at 5,185 lines holds routing, Pydantic models, business logic, PDF rendering, the salary engine, and HTML email pages. No service or repository layer, **no `Depends()` anywhere**.
- Route handlers are called directly as functions (`get_leave_balance()`, `get_attendance_calendar()`) — HTTP handlers doubling as the domain layer.
- Circular dependency `router ↔ employee_agent`, worked around with function-local imports.
- `requirements.txt` has **zero version pins**. `google-generativeai`, `mediapipe`, `opencv-python-headless`, `pdfkit`, and `python-multipart` are declared but unused; `python-dateutil`, `dnspython`, and `numpy` are used but undeclared.
- No `.dockerignore` — `chroma_local_db/chroma.sqlite3`, `generated_docs/`, debug scripts, and signed PDFs all ship in the Lambda image.
- **No background jobs.** SMTP sends, Chroma upserts, and S3 uploads all block the request. `/admin/sync-all` purges and re-indexes the entire database synchronously in one HTTP request.
- `database/vector_client.py` (97 lines) is imported nowhere. ~49 loose debug scripts committed, including `debug_user{,_v2,_v3}.py`, `extract_vars{,_v2,_v3}.py`, a Node.js file inside the Python package (`api/audit_db.js`), a 0-byte `lets.py`, and `push_templates.py` with hardcoded paths to a machine-specific directory that no longer exists.

**Frontend**
- **No route guards, no `<ProtectedRoute>`, no RBAC layer** — role logic is one boolean at `App.jsx:179` choosing which `<Routes>` block mounts.
- **No API client abstraction.** 105 hand-rolled `fetch`/`axios` calls across 22 files. Adding an auth header later means touching all of them.
- **Three conflicting API base URLs**: `config.js` falls back to `:8081`, `.env` says `:8000`, `EmployeeAssistant.jsx:47` hardcodes a third.
- **No state management, no React Context, no React Query.** `AdminDashboard.jsx` declares 60+ `useState` hooks and dispatches all fetching through a 90-line `if/else` chain.
- **No ErrorBoundary, no code splitting** — one render throw blanks the app, and every employee downloads the 4,512-line admin dashboard.
- 72 `alert()` calls and 87 `console.*` as the production UX and error-reporting strategy. No tests.
- 2,329 inline `style={{...}}` objects alongside a 1,397-line CSS design system.
- `lucide-react` and `clsx` sit in `devDependencies` while 24 runtime files import them.
- 10.4 MB of unoptimized PNGs in `public/`, including one 6.9 MB image.
- **MediaPipe loaded from jsdelivr at runtime** with no SRI and no fallback — onboarding breaks silently if the CDN is blocked.
- **`amplify.yml` has no SPA rewrite rule**, so every deep link 404s unless configured manually in the console.
- ~2,300 lines of confirmed dead components, plus `.cjs` codemod scripts and `.txt` file-based version control committed inside `src/pages/`.

**Branding drift:** the login screen is greytHR/Greytip, the app is NeuzenAI, the infrastructure is `dhanadurga-hrms`.

---

## 8. Suggested priority order

1. **Implement real authentication** — hash passwords (bcrypt), issue JWTs, add a `get_current_user` dependency, derive `employee_id`/`admin_email` from the token instead of query params. Everything below is cosmetic next to this.
2. **Rotate the hardcoded credentials** in `router.py:296-297` and purge the committed `.env` and signed PDFs from git history.
3. **Fix the `EmployeeSignatureRequest` / `KudosRequest` collision** — offer-letter signing and kudos are both broken right now.
4. Sign approve-by-URL links (HMAC + expiry) and convert them to POST.
5. Resolve the four schema-drift bugs (leave rates, IFSC, items collection, template collection).
6. Remove the duplicate `enhanced_router` registration and the dead 5065–5111 template block.
7. Pin dependencies, add `.dockerignore`, drop the four unused heavy packages.
8. Extract an API client on the frontend, then a `<ProtectedRoute>` wrapper.
9. Convert attendance timestamps to BSON dates and index them.
10. Split `router.py` and `AdminDashboard.jsx` by domain.
