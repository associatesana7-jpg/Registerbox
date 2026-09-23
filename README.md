# RegisterBox AI

RegisterBox AI is an Expo/React Native application for discovering, purchasing, and tracking Indian business registrations and licences. The mobile-first experience follows the complete journey from passwordless login through business identification, compliance analysis, document collection, payment preparation, and ongoing tracking.

## Stack

- Expo SDK 57 and Expo Router
- React Native and TypeScript
- Supabase Auth, Postgres, Row Level Security, Storage, and Edge Functions
- Resend for branded authentication OTP emails

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and supply the public Supabase values.

3. Start Expo:

   ```bash
   npm run start
   ```

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npx expo-doctor
```

## Authentication

The app uses Supabase passwordless email authentication. `signInWithOtp` creates a user when needed and sends a six-digit code. `verifyOtp` establishes the session, after which the app stores the authenticated user's profile and business data under RLS.

Authentication email delivery is handled by the `send-auth-email` Supabase Edge Function. It validates Supabase's Standard Webhooks signature and sends the supplied OTP through Resend. Required hosted secrets:

- `RESEND_API_KEY` or the existing compatible name `Resend_api_key`
- `SEND_EMAIL_HOOK_SECRET`
- `RESEND_FROM_EMAIL` for production delivery from a verified Resend domain; otherwise the function uses Resend's test sender

The deployed function must be configured as the enabled HTTPS **Send Email hook** in Supabase Auth.

## Supabase

The migrations in `supabase/migrations` define the RegisterBox data model, RLS policies, storage policies, compliance catalogue, and the database-backed compliance scan function. The frontend uses only a publishable key; service-role credentials must never be included in the app.

The private `business-documents` bucket stores uploads beneath each authenticated user's folder.

## Current payment behavior

The checkout screen records a pending order and payment intent in Supabase. A real charge is intentionally not claimed until payment-provider credentials and webhook verification are configured.
