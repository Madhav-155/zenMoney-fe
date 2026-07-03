# ZenMoney — Frontend

<p align="center">
  <img src="./public/favicon.ico" width="48" alt="ZenMoney logo" />
</p>

<p align="center">
  <strong>A modern personal finance tracker built with React, Vite, TypeScript, and Supabase.</strong><br/>
  Track expenses, income, subscriptions, and groups — with AI-powered transaction categorization.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white" />
</p>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [AI-Powered Categorization (Groq)](#ai-powered-categorization-groq)
- [Supabase Setup](#supabase-setup)
- [Email Reports](#email-reports)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)

---

## Features

- 📊 **Dashboard** — Overview of income, expenses, budget usage, and net balance
- 💸 **Transactions** — Add, view, and delete income/expense transactions
- 🤖 **Smart Transaction Input** — Natural language parsing (`"spent 500 on coffee at Starbucks via UPI"`) with AI or keyword fallback
- 📦 **Subscriptions** — Track recurring subscriptions with billing dates and trial alerts
- 👥 **Groups** — Split expenses across multiple people and track balances
- 🧾 **Owed Tracking** — Log money you owe or are owed
- 📈 **Charts & Reports** — Spending by category, trends over time
- 📧 **Email Reports** — Automated weekly and monthly financial summaries via Supabase Edge Functions + Resend
- 🌙 **Dark / Light Mode** — Full theme toggle support
- 👤 **Profile Management** — Avatar, username, display name, monthly budget, password change
- 🔒 **Authentication** — Email/password auth via Supabase or the custom Express backend

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| State/Data | TanStack Query v5 |
| Routing | React Router v6 |
| Charts | Recharts |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod |
| Backend-as-a-Service | Supabase (Auth, Postgres, Edge Functions) |
| AI Categorization | Groq LLM (free tier, `mixtral-8x7b-32768`) |
| Email | Resend + Supabase Edge Functions |
| Testing | Vitest + Testing Library |

---

## Project Structure

```
frontend/
├── public/                    # Static assets (favicon, robots.txt)
├── src/
│   ├── assets/                # Images and static files
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── AddTransactionForm.tsx
│   │   ├── AddSubscriptionForm.tsx
│   │   ├── AddOwedForm.tsx
│   │   ├── BudgetDisplay.tsx
│   │   ├── DashboardSkeletons.tsx
│   │   ├── Navbar.tsx
│   │   └── SmartTransactionInput.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Global auth state
│   │   └── UIModeContext.tsx   # Standard / Easy mode toggle
│   ├── hooks/
│   │   ├── useFinanceData.ts   # All data-fetching hooks
│   │   ├── financeFetchers.ts  # Supabase query functions
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/
│   │   └── supabase/          # Auto-generated Supabase client + types
│   ├── lib/
│   │   └── utils.ts           # `cn()` class helper
│   ├── pages/
│   │   ├── LandingPage.tsx    # Public landing page
│   │   ├── AuthPage.tsx       # Sign up / Sign in
│   │   ├── Dashboard.tsx      # Main app dashboard
│   │   ├── ProfilePage.tsx    # User settings
│   │   ├── Index.tsx          # Route redirect
│   │   └── NotFound.tsx       # 404 page
│   ├── utils/
│   │   └── llmCategorizer.ts  # Groq LLM + keyword fallback
│   ├── App.tsx                # Root component with routing
│   ├── main.tsx               # Entry point
│   ├── index.css              # Global styles
│   └── vite-env.d.ts
├── supabase/                  # Supabase project config
│   ├── config.toml
│   ├── functions/
│   │   └── send-reports/      # Edge function for email reports
│   └── migrations/            # Database migration SQL files
├── supabase_setup.sql         # Full DB schema for manual setup
├── .env                       # Local environment variables (not committed)
├── .env.example               # Template for environment variables
├── index.html                 # HTML entry point
├── vite.config.ts             # Vite configuration
├── tailwind.config.ts         # Tailwind theme configuration
├── tsconfig.json              # TypeScript config
├── components.json            # shadcn/ui registry config
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **npm** v9+ (comes with Node.js)
- A **Supabase** project — [supabase.com](https://supabase.com) (free tier works)
- *(Optional)* **Groq API key** for AI categorization — [console.groq.com](https://console.groq.com)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` — see the [Environment Variables](#environment-variables) section below.

### 3. Set Up the Database

Run the SQL schema against your Supabase project (one-time setup):

```bash
# Option A: Paste supabase_setup.sql into the Supabase SQL editor
# Option B: Use the Supabase CLI
supabase db push
```

### 4. Run the Dev Server

```bash
npm run dev
```

The app will be available at **http://localhost:8080**

---

## Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

```env
# ── Supabase ─────────────────────────────────────────────────────────────────
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
VITE_SUPABASE_PROJECT_ID=your_project_id

# ── Express Backend (optional, only if using custom backend) ──────────────────
VITE_API_URL=http://localhost:5000

# ── Groq AI Categorization (optional, free tier) ─────────────────────────────
# Get your key at: https://console.groq.com
# Leave blank to use keyword-based categorization as fallback
VITE_GROQ_API_KEY=gsk_your_groq_api_key_here

# ── Email Reports (optional, via Resend) ──────────────────────────────────────
# Set in Supabase Edge Function secrets, not here
RESEND_API_KEY=your_resend_api_key_here
REPORTS_FROM_EMAIL=reports@yourdomain.com
```

> All frontend variables **must** be prefixed with `VITE_` to be accessible in the browser.

---

## AI-Powered Categorization (Groq)

ZenMoney uses **Groq's free LLM API** (`mixtral-8x7b-32768`) to intelligently parse natural language transaction inputs.

### How it works

1. Type a natural language description in the Smart Transaction Input:
   > `"Spent 2000 on kitchen items in Dmart via UPI"`
2. The app calls Groq's API and returns structured data:
   ```json
   { "amount": 2000, "vendor": "Dmart", "category": "Food & Drink", "source": "UPI" }
   ```
3. A **🚀 AI** badge appears when LLM was used; **🔍 Text** when keywords were used.

### Fallback behavior

If Groq is unavailable or no API key is set, the app **silently falls back** to keyword-based matching — the app always works offline too.

| Scenario | Behavior |
|----------|----------|
| No API key set | Keyword matching (instant, offline) |
| Invalid / expired key | Keyword matching |
| Groq rate limited | Keyword matching |
| Valid key + network | Groq LLM (~500ms, 90–95% accuracy) |

### Setup

1. Visit [console.groq.com](https://console.groq.com) and sign up (free, no credit card)
2. Create an API key under **API Keys**
3. Add it to `frontend/.env`:
   ```
   VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
   ```
4. Restart the dev server (`Ctrl+C` then `npm run dev`)

---

## Supabase Setup

### Database Schema

Run `supabase_setup.sql` in the Supabase SQL editor to create all required tables:

| Table | Purpose |
|-------|---------|
| `users` | Custom auth users (email + hashed password) |
| `profiles` | User display name, username, avatar, budget, timezone |
| `transactions` | Income and expense records |
| `subscriptions` | Recurring subscription tracking |
| `groups` | Expense-splitting groups |
| `group_members` | Group membership and balances |
| `report_threads` | Email thread roots per user per month |
| `report_runs` | Deduplication log for sent reports |

### Running Migrations

```bash
# Apply all migrations to your linked Supabase project
supabase db push

# Or apply to local Supabase dev instance
supabase start
supabase db reset
```

---

## Email Reports

ZenMoney sends **weekly and monthly transaction reports** via email using:
- [Resend](https://resend.com) — transactional email API (free tier available)
- **Supabase Edge Functions** — serverless function (`supabase/functions/send-reports/`)

### What gets sent

- Weekly reports covering each week of the month (1–7, 8–14, 15–21, 22–end)
- Monthly summary at the end of each month
- All reports include a PDF attachment with transaction details
- Weekly reports for the same month are delivered as a **single email thread**

### Deploy the Edge Function

```bash
# From the frontend/ directory
supabase functions deploy send-reports
```

### Set Edge Function Secrets

In your Supabase project dashboard → **Edge Functions → Secrets**:

```
SUPABASE_URL          = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
RESEND_API_KEY        = re_xxxxxxxx
REPORTS_FROM_EMAIL    = reports@yourdomain.com
```

### Schedule the Function

In Supabase, schedule the function to run **hourly** so it respects each user's local timezone:

```
cron: "5 * * * *"
function: send-reports
```

### Testing Without Sending Emails

```bash
POST /functions/v1/send-reports
{
  "dryRun": true,
  "targetDate": "2026-02-08T08:00:00Z"
}
```

---

## Available Scripts

```bash
# Start development server (http://localhost:8080)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Lint the codebase
npm run lint
```

---

## Deployment

### Deploy to Vercel (Recommended)

1. Push the `frontend/` folder to a GitHub repo (or set the root directory to `frontend/` in Vercel settings)
2. Connect your repo to [vercel.com](https://vercel.com)
3. Set the **Root Directory** to `frontend`
4. Add all required environment variables in the Vercel dashboard
5. Click **Deploy**

### Deploy to Netlify

1. Connect your repo to [netlify.com](https://netlify.com)
2. Set **Base directory** → `frontend`
3. Set **Build command** → `npm run build`
4. Set **Publish directory** → `frontend/dist`
5. Add environment variables in Site Settings → Environment Variables
6. Deploy

### Deploy to Cloudflare Pages

```bash
cd frontend
npm run build
# Upload the dist/ folder to Cloudflare Pages
```

> **Note:** Since ZenMoney uses React Router for client-side routing, add a `_redirects` file in `frontend/public/`:
> ```
> /*    /index.html   200
> ```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT License © 2026 ZenMoney
