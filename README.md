# TEAMS Operations V1

TEAMS Operations V1 for MEP contracting and maintenance. Deploy this repository to the protected Cloudflare Worker at `ops.teams.com.kh`. The separate [public demo](https://operations.teams.com.kh/) uses fictional browser-local data.

[GitHub to Cloudflare deployment instructions](docs/PRODUCTION_DEPLOYMENT.md#deploy-from-github)

## Run and verify

- Use Node.js 24 or later and run `npm ci`.
- Run `npm test` to exercise the HTTP API, business rules and SQLite transactions.
- Run `npm run dev` from a local development checkout. The local server uses a development identity and SQLite with on-disk attachments. Do not expose the development server to real users.
- Run `npm run build` to produce the protected Cloudflare Worker in `dist/server/index.js`.
- The database migrations are in `drizzle/`. Append new migrations and update the journal for schema changes.
- `public/vendor` includes PDF.js under its Apache 2.0 license. The application reads PDF text in the browser. PDF.js requires no server-side OCR service for this flow.

## Architecture

A responsive browser UI calls a same-origin Cloudflare Worker. The production entry point requires identity from the configured Cloudflare Access application, then passes the verified email to the employee membership and role checks. The Node server is for local development with SQLite and synthetic identities.

D1 holds records, revision numbers and append-only audit entries. Records have durable identifiers, a kind, indexed references to the parent and project, and a validated JSON payload. Business logic resolves other typed references. An SQL trigger rejects stale revisions. A batch commits the audit event and changed records together. Idempotency keys make repeated submissions return the original result. Conflict retries reload the complete current snapshot and recompute business rules before committing. This global revision favors correctness and simplicity at current team size. Benchmark and introduce pagination, selective reads and narrower write serialization before a larger rollout.

R2 holds documents under random private keys. The Worker checks the linked record's permissions at upload and download. Failed metadata writes attempt to remove the uploaded object. A maintenance process should reconcile orphan files after interruptions and fictional resets. Downloads are served as attachments.

### Record links

| Parent | Linked records |
| --- | --- |
| Client | Contacts, projects, tenders, quotations, maintenance contracts |
| Tender | Source documents, assessment, associated quotations |
| Quotation | BOQ lines, price snapshots, approved version, awarded project |
| Project | Approved budget, material requirements, costs, progress, variations, milestones, claims |
| Requisition | Supplier offers, purchase order, goods receipts |
| Material | Price history, warehouse movements, reservations, physical counts |
| Maintenance contract | Recurring visits, checklist, job materials, completed report |
| Certified claim | Invoice reference, payments, reversing payments |
| Settings | Approval limits, currencies, warehouse access, employee permissions |

### Request API

- `GET /api/state` returns permitted records and role-scoped dashboard data.
- `POST /api/action` accepts an action, data object and unique request key.
- `POST /api/upload` accepts a multipart attachment linked to an authorized record.
- `GET /api/file/:id` returns an authorized attachment.
- `GET /api/export` generates a scoped PDF or XLSX.
- `GET /api/audit` lists recent activity for administrators and auditors.
- `GET /api/backup` returns a logical operations snapshot for administrators. It excludes document objects.

### Operating assumptions

- USD amounts round to cents. KHR amounts round to whole riel. Cross-currency posting requires a verified price already converted into the record currency. Reports aggregate their configured currency only.
- Margin applies to the selling price before tax. Markup uses the cost basis. An approved quote snapshots approved assumptions, prices and line items.
- Tender cash exposure is monthly. It assumes even progress receipts after the configured delay, retention and collateral release after the last progress receipt, and no other cash flow. Confirm the actual contract schedule separately.
- Procurement approval uses available stock, outstanding orders, project budget and delegated limits. Stock changes are recorded as ledger movements. Usable issues and returns affect project consumption. Project commitments include open PO amounts and receipts allocated to the project that remain unissued.
- Claim, certification, invoice reference and payment have separate records. The forecast treats due invoice amounts as expected cash and unreceived orders as open commitments. Payroll and loans enter as manual forecast inputs. Dated opening cash is required for an estimated running balance.

## Public demonstration

Set `TEAMS_MODE=public-demo` for a public deployment. In this mode the public browser demo uses its own data and leaves the existing D1 records and R2 attachments untouched. The browser seeds its own fictional dataset and uses IndexedDB for records and attachments. Reports and exports are generated in the browser. Changes are isolated by browser profile and do not synchronize across devices. A demo reset restores the sample records in that browser only.

### Public role scenarios

All 17 permission profiles are available in the dashboard role switcher. The four limited profiles start with fictional assignments for installation, maintenance and delivery. Existing demo records are retained when the new assignments are added to browser storage. The public demo has no server-side access to employee or operational records. The former private link redirects to the public dashboard.

## Team deployment

Deploy a dedicated employee environment with fresh D1 and private R2 bindings. Configure the Cloudflare Access application and these runtime values before enabling access:

- `TEAMS_MODE=team`
- `TEAMS_APP_HOST=ops.teams.com.kh`
- `TEAMS_ACCESS_AUD` equal to the configured Access application's audience
- `TEAMS_OWNER_EMAIL` equal to the intended administrator's verified Access email

The database rejects switching from fictional mode to team mode after initialization. Keep the owner email and ordinary employees' memberships in their authorized environment only. Sign in as the configured owner and add approved accounts in User management. Use distinct proposer and approver accounts to test authority. Run UAT with each operating department before switching any real transactions to the application.

The production Platform Administrator opens the admin dashboard, User management, Admin settings and Activity logs. Under **User management > Add user**, assign the Managing Director profile to a separate account with its own approved Cloudflare Access email. Enable **Active access** when the account is ready for testing. Platform Administrators can manage all assignable profiles. The configured deployment owner is managed through `TEAMS_OWNER_EMAIL`. Removing a managed account disables sign-in and keeps its record and audit history. Restoring it leaves sign-in disabled.

The MD and HR Department Head use **Employees** to manage official titles, employee IDs, departments, teams, job functions and allowed permission profiles. The MD manages business profiles. The HR Department Head manages ordinary staff profiles. Keep **Active access** off for directory-only records. Import user IDs as text to preserve leading zeros. The spreadsheet import starts accounts with sign-in disabled.

Cloudflare Access and TEAMS must both authorize a live sign-in. Directory-only records do not occupy Cloudflare seats. Manage Cloudflare Access policy, sessions and seat removal in the Cloudflare dashboard when offboarding a tester.

Admin settings controls Resend sender/routing, whether sending and receiving are enabled, OpenAI review and usage limits, and the default upload quota. Set an individual override in User management. Quotas measure stored documents and frozen outbound email attachment copies. Existing files remain available when an account reaches its quota. Configure provider credentials in Cloudflare Worker Secrets. Apply `drizzle/0002_platform_activity.sql` for seven-day diagnostics of failed and slow requests. The activity view also shows recent audit actions with timestamps and actors.

## Backup and recovery

- Record the source version and deployment version. Export the administrator snapshot for review and reconciliation.
- Have the hosting administrator arrange consistent, protected D1 backups and copies of R2 objects with access and retention appropriate to the organization. Keep database snapshots and file copies from the same recovery point. The logical snapshot is not a restore image.
- For the local adapter, stop writes, copy `var/teams.sqlite` together with `var/files`, and label the bundle with its source commit and timestamp. Restore into a separate working directory first.
- For hosted recovery, restore D1 and R2 into an isolated environment and deploy the matching source version. Verify clients, quote totals, stock balances, payments and file access. Compare sample audit entries to source evidence. Resume writes only after the administrator validates the restored records.
- Native production backup scheduling and a hosted recovery drill are pending.

## Release limitations

Employee sign-in uses Cloudflare Access. The public fictional demo requires no account. Role actions and department profiles are defined in the application. OpenAI tender, BOQ and quotation review is opt-in after provider configuration and acceptance. Finance supports commercial and tax invoice workflows subject to validation of the company profile, tax details and templates. Accounting integration and reconciliation are pending.

The BOQ mapper handles CSV, .xlsx, and supported searchable PDF layouts with manual confirmation. The master import currently covers clients, suppliers, materials, projects, maintenance contracts, employee roles and verified opening stock. Historical outstanding claims and collections require manual entry. Site documents use a standard English PDF font. Khmer data can be viewed and exported as Unicode in the browser and spreadsheets. English/Khmer interface localization and locally hosted Khmer fonts are implemented. Embedded/shaped Khmer PDF output remains deferred; do not treat Khmer UI support as Khmer PDF support. Browser camera scanning requires BarcodeDetector support and camera permission. Manual code search and keyboard-scanner entry remain available.

Version 2 candidates include full financial migration, configurable PDF stamp/signature and Khmer fonts, editable labor and productivity libraries, recurring background jobs and email, project-specific assignment scopes, volume/load testing, accounting reconciliation, supplier-offer export, cross-currency costing, and restore tooling.


## Maintenance clients and correspondence

- Preserve existing contracts and client records. Contracts distinguish MEP O&M, scheduled maintenance (with optional resident technicians), and one-time troubleshooting. Existing service relationships determine directory tags until explicit tags are saved. Maintenance can create its own clients and share an existing installation client without duplicating it. Primary-contact edits retain additional contacts.
- Agreement drafting, separate review/authorization and locked revisions remain available. Signatory authority must be supplied explicitly. Client PDF and Excel exports represent the approved revision. No scanning step is required to send them. Historical dispatch records and their attachments remain accessible as history.
- Email has shared mailboxes for Installation, Maintenance, and Business/Support. Role profiles constrain mailbox access. Compose supports To/Cc/Bcc, basic formatting, drafts, reply/reply-all, forwarding with attachments, read/unread, stars, archive/trash/restore and linked project/client/service records. Inbox refreshes while open; received HTML is shown as safe plain text with remote content disabled.
- Attach local uploads, existing accessible documents, forwarded email attachments, or approved client exports. Final quote exports exclude internal costs and margins. Client Excel uses an Artifact Tool letterhead scaffold with the official logo, populated BOQ, typed numbers, cached formula totals, terms, acceptance fields and print settings. PDF and Excel selling totals reconcile to the approved quotation.
- Public mode simulates sending and incoming mail in IndexedDB. It does not touch hosted D1/R2 or call an external email provider. The Receive demo email control explicitly simulates an incoming message. Existing browser records receive additional fixtures once and are not reset.

## Live email setup

Live email is not configured in the public deployment. A dedicated authenticated `TEAMS_MODE=team` environment can use:

- `TEAMS_RESEND_API_KEY`: secret Resend API key with the required send/receive access.
- `TEAMS_EMAIL_FROM`: provider-verified sender identity.
- `TEAMS_RESEND_WEBHOOK_SECRET`: signing secret for the registered webhook.
- `TEAMS_EMAIL_ROUTING`: JSON object mapping `installation`, `maintenance` and/or `general` to arrays of receiving addresses. Configure provider domain/MX receiving separately. Addresses shared by more than one mailbox are not auto-routed.
- Provider webhook: `https://<team-deployment>/api/mail/webhook`, subscribed to received and relevant delivery events. Public and fictional modes do not accept real incoming events.

The send endpoint `/api/mail/send` locks a saved draft and freezes its exact attachment bytes before provider submission. Sender, recipients, body and files remain immutable during retries. Duplicate submissions reuse the same outbox ID and provider idempotency key. Unknown/rejected attempts can retry for up to 23 hours; older attempts require provider reconciliation before any new send. Provider acceptance and confirmed delivery are separate statuses.

The receiving endpoint verifies Svix HMAC signatures against the raw body, rejects timestamps outside five minutes and deduplicates provider events. It retrieves content from the provider API, routes only to a configured mailbox, links replies by Message-ID where available, and matches a client contact only when unique. Unlinked messages can be linked manually. Incoming attachments are downloaded through the authenticated mailbox endpoint from the provider CDN. Files are downloaded as attachments, never executed or rendered inline. Attachment total for outgoing messages is 10 MB, with at most 20 selected files.

No real email was sent during development. Live provider calls were verified with mocks. Provider/domain configuration and a real delivery UAT remain necessary before operational use.


## Mobile, Khmer/English and PWA

The language picker persists `teams-language` locally. The UI dictionary translates interface labels without rewriting operational data, entered text, record codes or exported documents. Locally hosted Noto Sans Khmer regular/bold fonts are included with their license. Source names and official job titles retain their spelling.

The field layout has role-aware bottom navigation, named work shortcuts, touch controls, card tables, phone-sized line editors and full-screen dialogs. The manifest uses TEAMS icons and standalone display. Settings contains installation help and the production handoff. Install prompts are browser-dependent; iPhone users can use Safari Share > Add to Home Screen.

The service worker precaches only an explicit public asset allowlist. API/authentication paths, private records and attachments never enter its cache. Offline navigation shows `/offline.html`; no mutations are queued, replayed or silently submitted. Pending worker updates require a user-triggered reload prompt. A manifest/service-worker release does not activate any employee login or connect real email.

Production components, configuration, sequencing, acceptance evidence and remaining launch blockers are documented in [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md). The blank [deployment/production.env.example](deployment/production.env.example) contains no real credentials. `/deployment-guide.html` provides the same handoff inside Settings. The current public demo must remain separate from a future authenticated production deployment.

### Language switching and installed-app updates

English/Khmer selection uses explicit buttons in the main header and dialogs. It updates the current interface without recreating forms, preserves unsaved input, and synchronizes the saved preference across open tabs and resumed pages. The native selector event handlers remain compatible with older open UI copies.

The build versions the HTML entry script, stylesheet, static/dynamic module imports and PDF worker URL with the same content identifier. This keeps a new document from loading scripts from an older cache-first installed app. The service worker caches exact allowlisted versioned URLs only, while API/authentication requests and arbitrary query variants stay outside its cache. An update does not clear IndexedDB or operational records.

### Demo role selection

The public demo offers direct, searchable role/PIC cards rather than an editable selection form. Selecting a named role loads its permitted state first, then commits the role, person, navigation and saved preference together. Each card opens the corresponding work area. Failure leaves the previous identity/data unchanged; older refreshes and duplicate clicks cannot overwrite an active change. This only changes the simulated demo session and does not grant or modify real account permissions.
