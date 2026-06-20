# nf-backstage-partner-frontend

Next.js partner portal scaffold for consuming and updating `nf-backstage` data with authentication delegated to `nf-id`.

## What is included

- App Router Next.js scaffold
- `next-auth` integration configured for `nf-id` as an OpenID Connect provider
- Hostname-driven white-label partner resolution
- Theme tokens applied per partner at request time
- Starter landing/dashboard experience for authenticated and unauthenticated users

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXTAUTH_URL`: public app origin
- `NEXTAUTH_SECRET`: random secret used by `next-auth`
- `AUTH_NFID_ISSUER`: OIDC issuer for `nf-id`
- `AUTH_NFID_CLIENT_ID`: OIDC client ID
- `AUTH_NFID_CLIENT_SECRET`: OIDC client secret
- `AUTH_NFID_SCOPE`: requested scopes
- `NEXT_PUBLIC_BACKSTAGE_API_URL`: base URL for `nf-backstage`

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To test white-label behavior locally, send a custom `Host` header through a proxy or add a local hostname that maps to `127.0.0.1`, then add that hostname in `/home/runner/work/nf-backstage-partner-frontend/nf-backstage-partner-frontend/src/lib/partners.ts`.

## Partner configuration

Partner-specific branding is defined in `/home/runner/work/nf-backstage-partner-frontend/nf-backstage-partner-frontend/src/lib/partners.ts`.

Each partner can define:

- hostnames
- display name
- support email
- API base URL
- theme colors

The scaffold includes a default configuration plus a sample `gritcreative.namfam.co` white-label mapping.
