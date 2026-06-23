# Elive Glow — Salon Management Dashboard

A production-ready, full-stack multi-branch salon management system built with **Next.js 14**, **Supabase**, and deployed via **Vercel**.

---

## ✨ Features

- **Role-based access**: Owner (full access) & Branch Manager (branch-scoped)
- **Dashboard**: KPIs, revenue/expense trends, customer growth charts
- **Sales tracking**: Cash & card, modification logs, owner-only deletion
- **Expense management**: Custom categories, cost monitoring
- **Staff performance**: Top weekly/monthly performer highlights
- **Customer database**: Auto-built from sales records, exportable
- **Appointments**: Calendar view, drag-to-reschedule, status tabs
- **Reports**: PDF & CSV exports for all modules
- **Settings**: User invitation flow, staff with photos, branch/service management
- **Audit log**: Complete action history (owner-only)
- **Mobile-optimized**: Responsive design with mobile sidebar drawer

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Charts | Recharts |
| PDF Export | jsPDF + jsPDF-autotable |
| CSV Export | Native JS |
| Deployment | Vercel |
| Auth | Supabase Auth (email invitation flow) |

---

## 🚀 Step-by-Step Setup

### Step 1 — Clone & Install

```bash
git clone <your-repo-url>
cd elive-glow
npm install
```

---

### Step 2 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Set:
   - **Project name**: `elive-glow`
   - **Database password**: Save this securely
   - **Region**: Choose closest to UAE (e.g., `eu-central-1`)
4. Wait for project to initialize (~2 minutes)

---

### Step 3 — Run Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click **Run**
5. You should see: "Success. No rows returned"

This creates:
- All tables (branches, profiles, staff, sales, expenses, appointments, audit logs, etc.)
- Row Level Security (RLS) policies
- Storage bucket for photos
- Auto-triggers (updated_at, profile creation on signup)
- Seed data (2 branches, default expense categories, services)

---

### Step 4 — Configure Supabase Auth

1. In Supabase, go to **Authentication → Settings**
2. Under **Email Auth**, ensure it is enabled
3. Under **Email Templates**, customize the invitation email if desired
4. Go to **Authentication → URL Configuration**
5. Set **Site URL**: `https://your-app.vercel.app` (update after Vercel deploy)
6. Add **Redirect URLs**:
   - `http://localhost:3000/auth/update-password`
   - `https://your-app.vercel.app/auth/update-password`

---

### Step 5 — Create Owner Account

After running the schema, create the first owner account:

1. Go to **Authentication → Users** in Supabase
2. Click **"Invite User"** and enter the owner's email
3. The user will receive an email to set their password
4. After they set their password, go to **Table Editor → profiles**
5. Find their row and set `role = 'owner'` and `status = 'active'`

**Or** run this SQL (replace with actual user ID and email):

```sql
-- After the owner signs up, update their role
UPDATE profiles
SET role = 'owner', status = 'active'
WHERE email = 'owner@eliveglow.com';
```

---

### Step 6 — Environment Variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Fill in your values from the Supabase project dashboard (**Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ **Never commit** `.env.local` to git. The `SUPABASE_SERVICE_ROLE_KEY` is sensitive and only used server-side for user invitation.

---

### Step 7 — Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## ☁️ Vercel Deployment

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial Elive Glow deployment"
git remote add origin https://github.com/yourusername/elive-glow.git
git push -u origin main
```

### Step 2 — Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js — keep default settings

### Step 3 — Set Environment Variables in Vercel

In the Vercel project settings → **Environment Variables**, add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

### Step 4 — Deploy

Click **Deploy**. Vercel will build and deploy automatically.

### Step 5 — Update Supabase Auth URLs

After deployment, go back to **Supabase → Authentication → URL Configuration** and:
- Set **Site URL** to your Vercel URL: `https://your-app.vercel.app`
- Ensure `https://your-app.vercel.app/auth/update-password` is in **Redirect URLs**

---

## 👤 User & Access Flow

### How Branch Manager Accounts Are Created

1. Owner logs in → goes to **Settings → Users**
2. Clicks **"Invite User"**, fills in name, email, role, branch
3. Invited user receives an email with a magic link
4. They click the link → redirected to `/auth/update-password`
5. They set their password → automatically redirected to their branch dashboard
6. Manager sees only their branch's data across all modules

### Role Capabilities

| Feature | Owner | Manager |
|---|---|---|
| See all branches | ✅ | ❌ |
| Add sales | ✅ | ✅ |
| Edit sales | ✅ (unlimited) | ✅ (once only) |
| Delete sales | ✅ | ❌ |
| Add expenses | ✅ | ✅ |
| Delete expenses | ✅ | ❌ |
| Add custom expense categories | ✅ | ❌ |
| View audit log | ✅ | ❌ |
| Invite users | ✅ | ❌ |
| Manage branches | ✅ | ❌ |
| Manage services | ✅ | view only |
| Export reports | ✅ | ✅ (branch-scoped) |

---

## 📁 Project Structure

```
elive-glow/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── update-password/page.tsx
│   │   ├── api/
│   │   │   └── invite-user/route.ts
│   │   ├── dashboard/page.tsx
│   │   ├── sales/page.tsx
│   │   ├── expenses/page.tsx
│   │   ├── staff/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── appointments/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── audit/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── AppLayout.tsx
│   │   ├── ui/
│   │   │   ├── Avatar.tsx
│   │   │   ├── BranchFilter.tsx
│   │   │   ├── DateFilterBar.tsx
│   │   │   ├── KPICard.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── PageHeader.tsx
│   ├── hooks/
│   │   └── useAuth.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.local.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── package.json
```

---

## 🔑 Key Design Decisions

**Sales modification rule**: Managers can only modify a sale once. The change is logged in the `modification_log` JSONB field and shown in a "Modified" badge with full change history.

**Customer auto-population**: When a sale is recorded, the customer record is automatically created or updated in the `customers` table. No manual customer entry needed.

**RLS enforcement**: All data access is controlled at the database level via Supabase Row Level Security. Even if someone bypasses the UI, they cannot access data outside their branch.

**Invitation flow**: Uses Supabase's `admin.inviteUserByEmail()` which sends a secure magic link. The user sets their own password via `/auth/update-password`. The `SUPABASE_SERVICE_ROLE_KEY` is only used in the server-side API route.

---

## 🛠️ Common Issues

**"Invalid JWT" or auth errors**
→ Make sure your `.env.local` values are correct and don't have trailing spaces.

**Invitations not sending**
→ Check Supabase → Authentication → Email Settings. Make sure SMTP is configured or use Supabase's built-in email service.

**RLS blocking data**
→ Make sure you've run the full migration SQL including all `CREATE POLICY` statements.

**Photos not uploading**
→ Verify the `avatars` storage bucket was created and policies are in place (included in migration SQL).

---

## 📧 Support

Built for **Elive Glow** · Dubai – Al Faris Mall & Sharjah – Tilal City
