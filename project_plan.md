# NARLA — Project Plan

> AI-driven apartment co-pilot for students, roommates, and shared households.
> Stack: Next.js 15 + React + TypeScript + Tailwind CSS + Clerk (auth) + Convex.dev (backend)

---

## Quick Start (Setup Checklist)

Before running the app for the first time, complete these steps:

### 1. Create accounts (if you haven't)
- [ ] [Clerk](https://clerk.com) — Create an app, get publishable key + secret key
- [ ] [Convex](https://convex.dev) — Create an account (free tier works)
- [ ] [Anthropic](https://console.anthropic.com) — Get an API key for AI insights

### 2. Configure Clerk JWT Template for Convex
- [ ] Go to Clerk Dashboard → JWT Templates → New Template → Select **Convex**
- [ ] Copy the "Issuer" URL (looks like `https://your-app.clerk.accounts.dev`)
- [ ] Note it for the `CLERK_JWT_ISSUER_DOMAIN` env var

### 3. Set up environment variables
- [ ] Copy `.env.local.example` → `.env.local`
- [ ] Fill in `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] Fill in `CLERK_SECRET_KEY`
- [ ] Fill in `CLERK_JWT_ISSUER_DOMAIN`

### 4. Initialize Convex
```bash
npx convex dev
# Follow prompts to log in and create a project
# This will generate convex/_generated/ and give you NEXT_PUBLIC_CONVEX_URL
```
- [ ] Copy the `NEXT_PUBLIC_CONVEX_URL` into `.env.local`

### 5. Set Anthropic API key in Convex
```bash
npx convex env set ANTHROPIC_API_KEY sk-ant-YOUR_KEY_HERE
```
- [ ] Set ANTHROPIC_API_KEY in Convex environment

### 6. Run the app
```bash
npm run dev
```
- [ ] App loads at http://localhost:3000
- [ ] Sign up → Onboarding → Create household → Dashboard

---

## Build Phases & Progress Tracker

### Phase 1: Project Bootstrap ✅
- [x] Next.js 15 + TypeScript + Tailwind scaffolded
- [x] Dependencies installed: Clerk, Convex, Anthropic SDK, Lucide, Recharts
- [x] `tailwind.config.ts` — Indigo/slate theme
- [x] `middleware.ts` — Clerk auth protection
- [x] `lib/utils.ts` — utility helpers
- [x] `components/ConvexClientProvider.tsx` — Convex + Clerk bridge
- [x] `app/layout.tsx` — Root layout with providers

### Phase 2: Convex Schema + Core Backend ✅
- [x] `convex/schema.ts` — 13 tables with indexes
- [x] `convex/auth.config.ts` — Clerk JWT bridge
- [x] `convex/_utils.ts` — `assertHouseholdMember()` security helper
- [x] `convex/users.ts` — `upsertUser`, `getMe`
- [x] `convex/households.ts` — create, join, get, remove member
- [x] `convex/chores.ts` — CRUD + rotate assignments
- [x] `convex/choreAssignments.ts` — mark complete, workload summary
- [x] `convex/bills.ts` — create with splits, payment tracking
- [x] `convex/groceries.ts` — add, mark bought/skipped, bulk add from receipt
- [x] `convex/inventory.ts` — add, use, get low stock, get expiring
- [x] `convex/receipts.ts` — upload URL + Claude Vision processing
- [x] `convex/insights.ts` — Claude API action + rule-based fallback
- [x] `convex/notifications.ts` — create, get, mark read
- [x] `convex/activityLog.ts` — log and retrieve activity
- [x] `convex/seed.ts` — demo data: "The Loft" household

### Phase 3: Auth Pages + Onboarding ✅
- [x] `app/sign-in/[[...sign-in]]/page.tsx` — Clerk SignIn component
- [x] `app/sign-up/[[...sign-up]]/page.tsx` — Clerk SignUp component
- [x] `app/page.tsx` — Auth redirect dispatcher
- [x] `app/onboarding/page.tsx` — Multi-step wizard (Create / Join)
- [x] `app/onboarding/layout.tsx` — Minimal layout

### Phase 4: App Shell + Navigation ✅
- [x] `app/(app)/layout.tsx` — Auth shell, user sync, household guard
- [x] `lib/contexts/HouseholdContext.tsx` — Shared household state
- [x] `lib/contexts/ToastContext.tsx` — Toast notification system
- [x] `components/layout/Sidebar.tsx` — Desktop sidebar nav
- [x] `components/layout/TopNav.tsx` — Mobile topbar + drawer
- [x] `components/layout/NotificationBell.tsx` — Bell with unread count

### Phase 5: Dashboard ✅
- [x] `app/(app)/dashboard/page.tsx`
- [x] `components/dashboard/HouseholdSummaryCard.tsx`
- [x] `components/dashboard/TodaySection.tsx`
- [x] `components/dashboard/ActivityFeed.tsx`
- [x] `components/dashboard/InsightPreviewCard.tsx`
- [x] `components/dashboard/LowStockWidget.tsx`
- [x] `components/dashboard/QuickActionsBar.tsx`

### Phase 6: Chores Module ✅
- [x] `app/(app)/chores/page.tsx` — Upcoming / Overdue / Completed tabs
- [x] `components/chores/ChoreCard.tsx`
- [x] `components/chores/AddChoreModal.tsx`
- [x] Workload bar chart (recharts)
- [x] Rotate assignments button

### Phase 7: Groceries Module ✅
- [x] `app/(app)/groceries/page.tsx` — Status filter, category groups
- [x] `components/groceries/AddGroceryItemModal.tsx`
- [x] `components/groceries/ReceiptUploadSection.tsx` — Claude Vision OCR
- [x] Receipt review modal (edit extracted items before confirming)
- [x] Frequent items suggestions

### Phase 8: Bills Module ✅
- [x] `app/(app)/bills/page.tsx` — Status filter, expandable shares
- [x] `components/bills/AddBillModal.tsx` — equal/custom/percentage splits
- [x] Per-member payment tracking
- [x] Monthly spending chart (recharts)

### Phase 9: Inventory Module ✅
- [x] `app/(app)/inventory/page.tsx` — Category tabs
- [x] `components/inventory/AddInventoryItemModal.tsx`
- [x] Low stock + expiration warnings
- [x] "Add to Grocery List" quick action

### Phase 10: AI Insights Module ✅
- [x] `app/(app)/insights/page.tsx`
- [x] Claude API integration via Convex action
- [x] Rule-based fallback insights
- [x] Insight cards with type badges, priority, mark-read
- [x] Generate Insights button

### Phase 11: Household + Settings ✅
- [x] `app/(app)/household/page.tsx` — Profile, invite code, members, preferences
- [x] Smart Apartment Integration placeholder
- [x] `app/(app)/settings/page.tsx` — Profile, notifications, sign out

### Phase 12: UI Primitives ✅
- [x] `components/ui/Button.tsx`
- [x] `components/ui/Card.tsx`
- [x] `components/ui/Badge.tsx`
- [x] `components/ui/Modal.tsx`
- [x] `components/ui/EmptyState.tsx`
- [x] `components/ui/Skeleton.tsx`
- [x] Toast system (ToastContext)

---

## Pending / Future Work

### Deployment (Phase 14)
- [ ] Run `npx convex deploy` for production
- [ ] Connect GitHub repo to Vercel
- [ ] Set env vars in Vercel dashboard
- [ ] Update Clerk allowed origins for production domain

### Nice-to-Have Enhancements
- [ ] Chore streak/points display per member
- [ ] Bill split custom amount UI (per-member inputs)
- [ ] Inventory edit flow (update quantity/threshold inline)
- [ ] Push notification delivery (email via Resend or similar)
- [ ] Recurring bill auto-regeneration via Convex scheduled functions
- [ ] Household join via shareable link (not just code)
- [ ] Dark mode toggle
- [ ] Receipt image preview in history
- [ ] Export household data

---

## Architecture Notes

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15 App Router | Pages, routing, SSR |
| Auth | Clerk | Sign in/up, sessions, user management |
| Database | Convex | Real-time queries, mutations, file storage |
| AI (Insights) | Claude API via Convex action | Household insight generation |
| AI (OCR) | Claude Vision via Convex action | Receipt item extraction |
| Styling | Tailwind CSS | Custom indigo/slate design system |
| Charts | Recharts | Spending and workload visualizations |
| Icons | Lucide React | Consistent icon set |

### Security Model
- All Convex queries/mutations require Clerk JWT authentication
- `assertHouseholdMember()` is called in every mutation/query that touches household data
- Users can only read/write data for households they belong to
- `ANTHROPIC_API_KEY` is stored only in Convex environment (never exposed to client)

### Real-time Updates
- Dashboard activity feed updates live when any household member takes action
- Grocery list updates instantly across all members
- Chore completions reflect immediately
- Notification bell count updates in real-time

---

## File Structure Summary

```
narla/
├── app/
│   ├── layout.tsx                  # ClerkProvider + ConvexProvider
│   ├── page.tsx                    # Auth redirect
│   ├── sign-in/[[...sign-in]]/     # Clerk sign-in
│   ├── sign-up/[[...sign-up]]/     # Clerk sign-up
│   ├── onboarding/                 # Create/join household wizard
│   └── (app)/                      # Protected app routes
│       ├── layout.tsx              # Auth shell + HouseholdProvider
│       ├── dashboard/
│       ├── groceries/
│       ├── chores/
│       ├── bills/
│       ├── inventory/
│       ├── insights/
│       ├── household/
│       └── settings/
├── components/
│   ├── ui/                         # Button, Card, Modal, Badge, etc.
│   ├── layout/                     # Sidebar, TopNav, NotificationBell
│   ├── dashboard/                  # Dashboard widgets
│   ├── chores/                     # ChoreCard, AddChoreModal
│   ├── groceries/                  # GroceryList, ReceiptUpload
│   ├── bills/                      # BillCard, AddBillModal
│   ├── inventory/                  # InventoryItemCard
│   └── household/                  # Member management
├── convex/
│   ├── schema.ts                   # 13-table DB schema
│   ├── _utils.ts                   # Auth helpers
│   ├── users.ts / households.ts    # Core data
│   ├── chores.ts / choreAssignments.ts
│   ├── bills.ts / groceries.ts
│   ├── inventory.ts / receipts.ts
│   ├── insights.ts                 # Claude API integration
│   ├── notifications.ts
│   ├── activityLog.ts
│   └── seed.ts                     # Demo data seeder
├── lib/
│   ├── utils.ts                    # cn(), formatDate, etc.
│   ├── contexts/
│   │   ├── HouseholdContext.tsx
│   │   └── ToastContext.tsx
│   └── hooks/
└── .env.local.example              # Environment variable template
```

---

## Session Notes

**Session 1 (2026-03-24):** Initial build — complete app scaffolded from scratch. All phases 1-13 implemented. App is ready to run after Convex + Clerk setup steps above.
