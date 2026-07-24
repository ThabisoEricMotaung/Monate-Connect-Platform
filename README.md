This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Backup, restore, and RLS

- `src/app/api/cron/database-backup/route.ts` runs daily, reads the core
  production tables (profiles, supplier_documents, rfqs, quotes,
  supplier_bank_details, subscriptions), and writes a JSON backup to
  Cloudflare R2.
- `scripts/restore-backup.mts` is a manually-run script that restores one of
  those backups into a separate, non-production Supabase project. It refuses
  to run against production.
- After a `--confirm` restore, it automatically applies
  `database/migrations/restore_test_apply_production_rls.sql`, which mirrors
  production's live RLS policies onto the restore-test project so that
  project's access rules match production, not just its data.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
