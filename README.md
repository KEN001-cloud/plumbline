# Plumbline: complete system

Plumbline is a fellowship platform where experts get paid to check and teach AI. The system includes:

- the public website
- an 8-step applicant onboarding
- a fellow workspace
- an admin dashboard for your team
- contact forms that email you

It runs on Supabase (accounts, database, file storage) and Resend (email).

```
plumbline/
├── website/                      Static site. Deploy this folder as-is (no build step)
│   ├── index.html                Landing page
│   ├── roles.html                76 roles with search and filters
│   ├── job.html                  Job description and application for one role (fellows can hold several)
│   ├── apply.html                8-step onboarding, saved to the applicant's account after every step
│   ├── login.html                Password log-in, email sign-in link, forgot/reset password
│   ├── workspace.html            Fellows only: tasks, training, payouts, profile
│   ├── admin.html                Team only: verify IDs, review tasks, answer messages, export CSV
│   ├── help.html                 Searchable help center and support form
│   ├── labs.html                 For AI labs page and project request form
│   ├── legal.html                Terms, privacy, fellow agreement (#terms, #privacy, #agreement)
│   └── assets/
│       ├── config.js             ← your Supabase URL, anon key and contact emails go here
│       ├── app.js                Supabase client, auth helpers, shared header and footer
│       ├── apply.js              Onboarding logic
│       ├── data.js               All content: roles, fields, tasks, quiz, FAQ, legal text, pay policy
│       ├── styles.css            Design system (colours, type, buttons, forms)
│       └── favicon.svg
├── supabase/
│   ├── schema.sql                Tables, row-level security, storage bucket, triggers, admin roles
│   └── functions/notify-message/index.ts   Emails you each new message (Resend)
└── tests/
    ├── e2e_test.py               47 browser checks against a stand-in Supabase
    └── run_tests.sh
```

**Tech:** plain HTML + [Alpine.js](https://alpinejs.dev) 3.14.8 + [supabase-js](https://supabase.com/docs/reference/javascript) 2.119.0, both loaded from the jsDelivr CDN. There's no Node build and no framework to update.

---

## How the system fits together

| Flow | What happens |
|---|---|
| **Apply** | `apply.html?role=…` pre-fills the role. Step 1 creates a Supabase Auth account, and a database trigger creates the `profiles` row. Each later step saves to `profiles`. ID, selfie and CV go to the private `fellow-files` bucket under the applicant's user id. |
| **Email confirmation** | Supabase emails a confirmation link. It works on any device and returns the applicant to step 2. |
| **Resume** | When an applicant logs in on any device, onboarding reopens at their saved step. |
| **Workspace** | Requires sign-in. Submissions go to `task_submissions` (one per task per fellow). Payout method and profile changes update `profiles`. |
| **Verification** | Fellows can only set their status to `pending`. Admins set `verified` or `rejected` in `admin.html`, which is enforced by a database trigger. |
| **Messages** | Help and labs forms insert into `messages` with a reference like `PL-7K2QD9`. A database webhook calls `notify-message`, which emails you with Reply-To set to the sender. |
| **Security** | Row Level Security: fellows see only their own data. The public can only *insert* messages. Admins (listed in `admins`) can read and update everything. |

---

## Setup (about 30 minutes)

### 1. Supabase project
1. Create a project at <https://supabase.com> (the free tier is fine).
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, then click **Run**.
3. **Project settings → API**: copy the **Project URL** and **anon public** key into `website/assets/config.js`, then set `SUPPORT_EMAIL` and `LABS_EMAIL`.

The anon key is designed to be public. Row Level Security is what protects the data.

### 2. Sign-in emails
Supabase's built-in sender only delivers to your own team and is heavily rate-limited, so you need a custom sender:
1. Create an account at <https://resend.com>, add your domain and verify its DNS records.
2. Supabase → **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key
   - sender `hello@your-domain.com`, name `Plumbline`
3. **Authentication → URL Configuration**:
   - **Site URL** = your live address
   - **Redirect URLs**: add `https://your-site/**`, plus `http://localhost:8080/**` for local testing
4. Keep **Authentication → Providers → Email → Confirm email** on.

### 3. Message notifications
```sh
cd plumbline                     # this folder (it contains supabase/)
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="Plumbline <hello@your-domain.com>" \
  SUPPORT_INBOX=you@your-domain.com LABS_INBOX=labs@your-domain.com WEBHOOK_SECRET=PASTE_A_LONG_RANDOM_STRING
supabase functions deploy notify-message --no-verify-jwt
```
Then go to **Database → Webhooks → Create a new hook**:
- table `messages`, event **Insert**
- type HTTP Request, `POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-message`
- header `x-webhook-secret` = the same random string

### 4. Make yourself an admin
1. Sign up on your site (or create a user under **Authentication → Users**).
2. Copy your user id from **Authentication → Users**.
3. In the SQL Editor, run:
   ```sql
   insert into public.admins (user_id) values ('YOUR-USER-ID');
   ```
4. Open `/admin.html`.

### 5. Deploy
Put the `website/` folder online with any static host:
- **Netlify:** drag `website/` onto <https://app.netlify.com/drop>
- **Vercel:** run `npx vercel` inside `website/`
- **Cloudflare Pages / GitHub Pages:** point the host at `website/`

Then set the live URL as Supabase's Site URL and add it to the Redirect URLs.

To test locally, run `cd website && python3 -m http.server 8080` and open <http://localhost:8080>.

---

## Running the fellowship (`admin.html`)
- **Applicants:** filter by ID status, search, and open someone to see their full application. **View ID**, **View selfie** and **View CV** open private files through 2-minute signed links. **Verify identity** and **Reject** set their status. **Export CSV** downloads the applicants currently shown.
- **Task submissions:** read ratings and justifications, then **Approve** or **Reject**.
- **Messages:** read support and labs requests, **Reply by email**, and **Mark handled**.

## Payments, notifications and the team dashboard
Fellows report minutes on each task. Approving work sets the pay from the task's hourly rate and the approved minutes. Pay people through your provider, then record the reference under **Payments** in `admin.html`. That page records payouts and sends no money. Fellows are never charged.

Notifications are written by the database and appear in the workspace. To email them too, deploy `supabase/functions/notify-fellow` and add a Database Webhook on INSERT into `public.notifications`, set up like the one for `notify-message`.

Tasks now live in the `tasks` table and are edited under **Tasks** in `admin.html`. The skills check is graded on the server from `quiz_key`. If you change the questions in `data.js`, update that table too.

## Projects and bans
After verifying someone in `admin.html`, invite them to a project. They join it in the workspace, and that project's tasks then appear. A task belongs to a project through the `task_projects` table, so add a row there for each new task. The admin page can also ban someone with a stated reason, which closes their tasks and invitations; they see the reason and can appeal through the help form.

## Referrals and invites
Fellows create invite links in the workspace, under **Refer & invite**: general, for a project, or for a task. The admin page shows who invited each person. There is no referral payment built in.

## Editing content
Everything fellows read lives in `website/assets/data.js`:
- `ROLES` (title, field, rate, people needed, levels, details). To add a role, add one `R(...)` line. Its job page works straight away.
- `TASKS`, `QUIZ`, `MODULES`
- `HOME_FAQ`, `HELP_FAQ`
- `LEGAL`
- the eligibility (`ELIG`) and payout (`PAY`) wording

Each role's skills and the longer job text by field live in `website/assets/jobs.js`. Add a line to `SKILLS` for a new role, otherwise it uses its field's skills.

Edit the file and redeploy.

## Tests
```sh
cd tests && ./run_tests.sh
```
This installs Playwright and runs every page in Chromium against an in-memory stand-in for Supabase. It runs 47 checks, covering:
- sign-up, all 8 onboarding steps, uploads and resuming
- the workspace and log-in
- the help and labs forms
- the admin actions
- every internal link
- zero JavaScript errors

It needs no Supabase project. After setup, also do one real sign-up on your live site to confirm the emails arrive.

## Before launch
- Have a lawyer review the draft legal text and policies in `data.js`.
- Replace the sample pay rates and tasks.
- Optional: connect an ID-verification provider (for example Smile ID or Persona) instead of reviewing documents by hand.
