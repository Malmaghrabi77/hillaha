# Halha (حلّها) — Vision build (EG + SA) — HungerStation-style

Apps:
- `apps/customer` (Expo)
- `apps/driver` (Expo)
- `apps/partner` (Next.js dashboard)
- `apps/web` (Next.js marketing website)

Shared:
- `packages/core` (rules, types, supabase helpers)
- `packages/ui` (theme)

Backend:
- `supabase/schema.sql`
- `supabase/policies.sql`

Consent is mandatory before activation (stored in `user_consents`).

## Run
```bash
npm install
npm run dev:customer
npm run dev:driver
npm run dev:partner
npm run dev:web
```
