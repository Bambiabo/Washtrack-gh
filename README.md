# BayQueue

BayQueue is a mobile-first car-wash and lube-bay management app for Ghana. It helps supervisors create jobs quickly, manage a live queue, collect cash or MoMo payments, send customer WhatsApp updates, reward loyal customers, and export manager reports.

## Features

- Supervisor job entry with plate, customer phone, service, and payment details
- Live queue with Supabase Realtime updates
- Cash and MoMo payment confirmation
- Five paid washes earn the sixth wash free
- WhatsApp receipt and ready-for-pickup message queue
- Manager reports with date filters and CSV export
- Multi-station support, user roles, and audit logging
- Vercel cron endpoint for sending queued WhatsApp messages

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- GitHub
- Vercel
- WhatsApp Cloud API
- Paystack for MoMo payment links

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Add these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_APP_URL=
```

4. Run the app:

```bash
npm run dev
```

## Supabase

Use the existing `bayqueue` Supabase project. The application expects tables including `profiles`, `stations`, `services`, `jobs`, `messages`, and `audit_logs`.

## Deployment

Deploy the repository to Vercel and configure the environment variables above. The scheduled WhatsApp sender is available at:

```text
/api/cron/send-messages
```

Protect it with the `CRON_SECRET` environment variable.

## Repository

The repository remains named `Washtrack-gh` for compatibility, but the product is branded **BayQueue**.
