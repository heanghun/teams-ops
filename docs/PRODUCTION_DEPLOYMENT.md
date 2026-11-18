# TEAMS Operations Production Deployment Handoff

The [TEAMS Operations source repository](https://github.com/heanghun/teams-ops) targets the protected production Worker at `ops.teams.com.kh`. The launch acceptance checks apply before real employee access and transactions.

## Deploy from GitHub

1. In the TEAMS Cloudflare account, create a dedicated D1 database and private R2 bucket. The config template uses names `teams-ops-production` and `teams-ops-production-files`. Use separate resources for staging.
2. Set up a Cloudflare Access application for `ops.teams.com.kh` and restrict it to approved users. Keep the application audience tag for the Worker and confirm the administrator's identity. Configure Access before binding the production domain.
3. Set the build variables for the Cloudflare Worker connection.

   | Build variable | Value |
   | --- | --- |
   | `NODE_VERSION` | `24` |
   | `TEAMS_D1_DATABASE_ID` | UUID of the dedicated production D1 database |
   | `TEAMS_D1_DATABASE_NAME` | Set if the name differs from `teams-ops-production` |
   | `TEAMS_R2_BUCKET_NAME` | Set if the name differs from `teams-ops-production-files` |

4. Generate the configuration in a local clone with the same D1/R2 build variables set. Authenticate Wrangler to the TEAMS account. Check the database name and apply the initial migrations before staff sign-in.

   ```sh
   npm ci
   npm test
   npm run build
   npm run configure:production
   npx wrangler deploy --dry-run --config wrangler.production.json
   npx wrangler d1 migrations apply teams-ops-production --remote --config wrangler.production.json
   ```

   If you use a different D1 name, use that verified name in the migration command. For future releases review and schedule schema migrations as a separate operation.

5. Connect `heanghun/teams-ops` in Cloudflare Workers Builds. Set the production branch to `main` and the root to the repository root. Enter the following commands and keep preview deployments off for these production bindings.

   | Workers Builds setting | Command |
   | --- | --- |
   | Build command | `npm test && npm run build && npm run configure:production` |
   | Deploy command | `npx wrangler deploy --config wrangler.production.json` |

6. In the Worker's runtime Variables and Secrets, set `TEAMS_ACCESS_AUD` and `TEAMS_OWNER_EMAIL`. The generated configuration retains dashboard variables on subsequent deployments. Access must supply the verified email through its Worker context. The app denies a wrong audience, missing identity or an alternate host. `workers.dev` and Workers version preview URLs are disabled.
7. Confirm the protected custom domain and TLS. Use separate pilot accounts for administrator, estimator, field roles and Finance. Run the acceptance scenarios below, including access denial, persistence and attachment permissions.

Add a dedicated Managing Director pilot account in **User management** using its approved Access email. The account has the MD's business permissions in the environment where it is activated. MD and HR Department Head manage staff records from **Employees** within their assigned role limits. Keep employee directory records without sign-in until the employee is ready to use TEAMS. Confirm available Access seats across the Cloudflare account before expanding the pilot.

The repository includes the AI review code. Set `TEAMS_AI_ENABLED` to `true` only after the separate AI acceptance. Enter OpenAI and Resend credentials as runtime secrets, with real employee and operating data imported into the protected environment.

## Current delivery

- The existing public demo remains at https://operations.teams.com.kh/ with its existing data bindings. It must remain isolated from real records.
- English and Khmer interface switching is saved per browser. Official names, job titles, record codes, leading-zero IDs, typed content and approved exports retain their source spelling and language.
- Phone/tablet navigation, role-aware field shortcuts, card layouts, large controls, full-screen forms and safe-area spacing are implemented.
- A manifest, TEAMS launcher icons, Apple touch icon, versioned service worker, installation help and offline page are implemented. Installation depends on the browser/device; it is not an App Store release.
- The service worker caches an explicit list of public static assets only. It does not cache authenticated responses, employee data, messages, project records, uploads or API calls. It does not queue or replay writes.
- A cold offline launch shows bilingual reconnection guidance. Live work, approvals, stock movements and email require connectivity. The browser-local public demo is not a shared database or a sync engine.
- `/api/health` is a no-store liveness endpoint. It does not assert database, storage or mail-provider readiness.

## Required deployment components

| Component | Required configuration or deliverable | Current status / accountable function |
| --- | --- | --- |
| Production environment | A separate protected deployment, separate D1 and R2 resources, distinct secrets and release history | Required; hosting administrator |
| Domain, DNS and HTTPS | Protected custom domain `ops.teams.com.kh`, valid HTTPS and a separate public demo | Deployment template specifies the production hostname. DNS, TLS and cutover are pending |
| Worker hosting | Cloudflare Worker ES module built by `npm run build`, trusted identity boundary, same-origin assets and API | Build implemented; production deployment pending |
| Database | D1 binding `DB`; apply the tracked SQL migration; enable operational monitoring and recovery | Schema implemented; separate production database required |
| File storage | Private R2 binding `BUCKET`; no public bucket; enforce object authorization on download | Adapter implemented; production bucket and retention policy required |
| Identity | Cloudflare Access application, verified sign-in, session termination, MFA, account recovery and offboarding | Production build reads the Access context. Tenant setup and live identity checks are pending |
| Worker's identity boundary | Confirm the Access audience matches `TEAMS_ACCESS_AUD` | Production entry discards client-supplied identity headers and uses the verified Access email |
| Employee access | Verified employee-to-account links, multiple permission profiles where authorized, explicit approvals, named administrators | Requires administrative provisioning and UAT; no accounts automatically activated |
| Employee directory | Controlled migration of all 67 employees and 2 interns from the source JSON, string IDs, departments/teams/positions, unresolved flags | Existing protected master workflow was built for staff-demo. Production directory migration and admin access need implementation/validation before real HR use |
| Opening operational data | Verified clients, suppliers, materials/units/prices, warehouse counts, active projects, approved budgets, service agreements, receivables and commitments | Templates/import workflow exist; TEAMS must provide and reconcile real data |
| Outbound email | Resend API, verified sender/domain, approved shared sender identity and mailbox permissions | Server adapter implemented; provider credentials, DNS and real delivery UAT pending |
| Incoming email | Receiving domain/MX, mailbox routing, signed webhook, incoming event subscription and delivery-event subscriptions | Handler implemented; domain/provider routing and external reachability/UAT pending |
| Mail identity | Decide reply addresses and common mailboxes. Existing app uses a configured sender, not a separate personal mailbox for every employee | TEAMS/admin must supply addresses; no addresses invented |
| Existing mailbox migration | Gmail/Microsoft 365 sync, IMAP/SMTP or historic-mail import if required | Not implemented. Current receiving integration is new inbound delivery via Resend, not a clone of an existing mailbox |
| Document outputs | Final approved letterhead, legal company details, tax/terms, numbering, correct PDF/XLSX totals | English PDF and populated client Excel implemented; TEAMS must approve final samples |
| Khmer PDF output | Font embedding/shaping and multi-page layout for Khmer names/text in generated client PDF | Not implemented. UI and Unicode Excel support do not make current English-font PDFs Khmer-ready |
| Scheduled operations | Authorized scheduled runner for maintenance recurrence/renewals and exception notifications, if automatic execution is required | Current actions are user-triggered. No automatic operational scheduler configured |
| AI document review | Set up a TEAMS-owned OpenAI project and evaluate a vision-capable Responses model with Structured Outputs. Approve permitted document classes, retention and operating limits | Candidate supports selected tender PDF review, listed BOQ extraction and saved quotation scope review. Provider is disabled by default and the live evaluation is pending |
| Monitoring | Worker error logs, uptime checks, D1/R2 errors, mail failures, signed-webhook failures, alert recipient | Native logs available; operational alerting/runbook ownership must be configured |
| Backups and restoration | Protected D1 recovery points + R2 object copies, retention, separate access, restore runbook and recorded drill | Required. Admin JSON snapshot excludes files and is not a complete restore image |
| Security operations | Secret management, dependency maintenance, account review, attachment scanning/quarantine, upload/request limits, abuse controls | Role/origin checks exist; malware scanning, rate limiting and external security review remain required |
| Mobile acceptance | Android Chrome and iPhone Safari install, Khmer readability, camera permission fallback, uploads, small screens, poor connectivity and update behavior | Browser responsive QA and automated checks performed; real-device field UAT still required |
| Support ownership | Named product owner, administrator, service support, change approval, incident response and training | TEAMS to appoint explicitly; this handoff makes no appointments |

## Runtime configuration

Use `deployment/production.env.example` as a blank configuration template. Store secret values in hosting secret management, never Git or browser JavaScript.

| Setting / binding | Purpose |
| --- | --- |
| `TEAMS_MODE=team` | Authenticated server-backed operating environment. Never change the existing public demo to this mode against its current database |
| `TEAMS_APP_HOST` | Hostname served by the production Worker. The template sets `ops.teams.com.kh` |
| `TEAMS_ACCESS_AUD` | Audience tag of the approved Cloudflare Access application |
| `TEAMS_OWNER_EMAIL` | Verified administrator email at the trusted sign-in boundary. This account has broad administrative authority; secure it and test offboarding |
| `DB` | Production D1 database binding |
| `BUCKET` | Production private R2 document bucket binding |
| `TEAMS_RESEND_API_KEY` | Secret provider key for sending and retrieving received mail |
| `TEAMS_EMAIL_FROM` | Sender display name and verified address approved by TEAMS |
| `TEAMS_RESEND_WEBHOOK_SECRET` | Secret signature key for `/api/mail/webhook` |
| `TEAMS_EMAIL_ROUTING` | JSON map of `installation`, `maintenance`, `general` to arrays of real receiving addresses |
| `TEAMS_AI_ENABLED` | Keep `false` until the AI acceptance below passes. Set `true` in the approved team environment |
| `TEAMS_OPENAI_API_KEY` | Secret restricted to the TEAMS OpenAI project. Keep staging and production keys separate |
| `TEAMS_OPENAI_MODEL` | Tested model or snapshot ID. Evaluate `gpt-6.1-terra` with the pilot document set |
| `TEAMS_AI_DAILY_LIMIT` / `TEAMS_AI_USER_DAILY_LIMIT` | Attempt limits per UTC day. Defaults are 30 per environment and 8 per signed-in user. Starts for the same user are at least 30 seconds apart |

Do not set `TEAMS_PERSONNEL_BOOTSTRAP` or leave a personnel import token enabled in production. The existing bootstrap is for the protected staff demonstration, not production migration.

No employee login emails, passwords, missing IDs, organizational appointments, reporting lines or approval authority may be invented. Directory employment records and login memberships are separate. Importing an employee must not activate an account.

## AI review acceptance

- Enable the API only behind the verified identity boundary for authorized commercial profiles. Use a scrubbed staging set covering English, Khmer, scanned pages, different units, multiple spreadsheet sheets, missing prices and incomplete or conflicting terms.
- Review a selected PDF up to 4 MB. Confirm the recipient is permitted to send it to OpenAI. Approved drawing takeoff, recognition of every scanned table, and engineering sign-off require separate evaluation. Use native XLSX/CSV mapping for structured BOQs.
- Compare each proposed quantity and source reference to the PDF. Confirm every row before transferring a complete extraction to an empty editable tender BOQ. Save through the existing assessment form. Preserve existing BOQs. Import and verify BOQs before approving the tender. Only Approved for Bid can generate the quotation draft. Resolve unmatched specifications, units and stale prices through the deterministic workflow.
- Quotation review sends scope and terms from the accessible commercial records plus any selected PDF. The request projection excludes structured prices, totals, balances, employee data and finance records. Apply TEAMS' rules to sensitive material in source documents and free-text clauses.
- AI responses are advisory. Design/QS checks scope and quantities, Procurement verifies catalog evidence, and authorized staff retain bid, price, approval and email decisions.
- Check the provider's data controls before processing real client documents. Requests use `store:false` and no provider file upload, tools or background storage. Confirm the applicable abuse monitoring, contract confidentiality and processing terms separately.
- Measure page/row accuracy, missed material lines, incorrect source references, Khmer comprehension, latency and token use. Agree the usage budget, failure threshold and incident owner. The `ai_review_runs` table logs attempt identifiers, timestamps, status and available token counts. Keep source text and results out of operational logs.
- Disable `TEAMS_AI_ENABLED` if quality, availability, confidentiality or budget drifts. The manual tender and quotation workflows remain available.

## Ordered deployment sequence

1. Assign operational owners and verify the configured Access application for `ops.teams.com.kh`. Keep the public demo available.
2. Create separate staging and production D1/R2 resources. Apply `drizzle/0000_operations.sql`, `drizzle/0001_ai_review.sql` and `drizzle/0002_platform_activity.sql` through the migration journal once. Preserve applied migrations and exclude fictional records from the live database.
3. Verify that Cloudflare Access supplies identity on production requests. Test anonymous requests and attempts with caller-supplied identity headers. Check that alternate Worker URLs are disabled.
4. Create a protected staging deployment in `team` mode. Seed only real empty-system settings. The code rejects an initialized fictional database in team mode.
5. Complete production personnel migration/admin directory visibility and bind verified sign-in accounts separately. Reconcile the 69 source records, leading-zero IDs and unresolved organizational information. Supply approval grants from a documented TEAMS decision, independently of job title.
6. Import reviewed operational masters and reconciled opening balances into staging. Log source files, cutoff dates and control totals. Have the corresponding TEAMS function validate each master and balance.
7. Configure sender domain, SPF/DKIM/DMARC as supplied by the provider, receiving MX, `TEAMS_EMAIL_ROUTING` and the signed webhook. Ensure `/api/mail/webhook` can receive signed provider POSTs without exposing other authenticated API routes. Configure provider events and test external delivery/receiving/bounces with approved test addresses.
8. Configure backups, private object retention, malware handling, limits and monitoring. Restore a matching D1/R2 recovery point into a separate environment and record reconciled results. Configure the AI sandbox and run its separate acceptance before AI activation.
9. Run the acceptance matrix below with distinct real test accounts and two devices. Review performance at expected data volume. Obtain TEAMS acceptance of English/Khmer copy and final documents.
10. Freeze legacy entry for the agreed cutover window, take a final verified backup/export, import the delta, reconcile and authorize the cutover. Do not erase legacy records. Retain a rollback point and known source/deployment version.
11. Publish the approved production version to the protected hostname. Monitor logins, writes, files, balances and email during the controlled pilot before wider activation.

## Go-live acceptance matrix

| Check | Required evidence |
| --- | --- |
| Access | Anonymous requests and forged headers denied; users cannot obtain another department's protected records or attachments; role switcher cannot elevate real permissions |
| Separation | Public demo has no route to production records, files or secrets; no protected employee roster, production data or customer email appears in precaches; approved public role examples remain public |
| Personnel | Exactly 69 source employment records with unchanged names, string IDs/leading zeros; no invented IDs or activated accounts; flag list reviewed |
| Authority | Job title, access profile and approval authority remain separate; role/profile/approval changes are auditable; disabled account cannot continue writing |
| Workflow | Approved bid -> reviewed draft -> independent approval -> final export -> client email -> acceptance -> operational handoff; maintenance client creation; multi-line requisition and partial receipts |
| AI | Anonymous and unrelated roles denied, source attachment belongs to the record, per-user and shared usage caps work, uncertainty blocks BOQ transfer, approved totals agree with the application; synthetic and authorized provider tests pass |
| Field | Installation/maintenance leads, technicians, stock and logistics see only permitted controls and assigned work; repeated taps do not duplicate transactions |
| Financial/stock | USD/KHR rounding, approved costs and selling totals reconcile; concurrent stock issues cannot overspend; claims, invoices and receipts retain separate records |
| Communication | Real send/receive/attachments/reply threading, routing, retry/dedup, provider failure and final-delivery status; internal costs cannot leak in client exports |
| Languages | English/Khmer switch and persistence; original employee/project/client values unchanged; Khmer reviewer signs off terminology and real-device readability |
| Documents | Approved PDF/XLSX completeness, print pagination, amounts and document language; Khmer PDF rendering validated if required at launch |
| PWA | HTTPS and manifest icons, Home screen standalone launch on both target platforms, safe areas/keyboards, update prompt, no silent reload of unsaved forms |
| Offline | Visible offline guidance; no cached private API response; no automatic financial, stock, approval or email submission after reconnection |
| Recovery | Tested restore of database plus files, row/control totals, audit samples, download permissions and a documented recovery time |
| Capacity | Load and concurrency benchmark against realistic employee usage and data size; global revision/full-snapshot design assessed before broad rollout |

## Release commands and artifacts

- Runtime: Node.js 24+ for local checks and build. The production bundle runs as a Worker, not the Node development server.
- Checks: `npm test`, `npm run build`, `node --check dist/server/index.js`, `git diff --check`.
- Hosting artifact: `dist/server/index.js` and generated `wrangler.production.json`. Configure the build using the chosen production resources.
- Migration source: `drizzle/0000_operations.sql`, `drizzle/0001_ai_review.sql`, `drizzle/meta/_journal.json`.
- Liveness monitor: `GET /api/health`, expected 200 JSON `status: ok`. Test authenticated state, file storage and provider configuration separately.
- Rollback: redeploy the prior known source version only after checking data compatibility. Code rollback alone does not reverse operational records or provider sends.

## Explicit launch blockers

A separate production environment, trusted identity and memberships, production personnel migration, real source-data reconciliation, provider configuration and UAT, security and recovery checks, and TEAMS departmental acceptance remain incomplete. Verify native invoice PDFs separately from Khmer quotation and agreement PDFs. Automatic recurrence, large-document processing and drawing takeoff are future scope.

## Platform references

- PWA installability: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Browser installation behavior: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing
- Private-data caching boundaries: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching
- OpenAI PDF inputs: https://developers.openai.com/api/docs/guides/file-inputs
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI data controls: https://developers.openai.com/api/docs/guides/your-data

Browser install menus differ by platform/version. Validate the supported field devices; a custom installation prompt is not available in every browser.
- Cloudflare Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- Cloudflare Access for Workers: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
