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

## Samples

The sandbox plays FLAC copies of the samples: lossless, and less than half the size of the WAV originals.

- `src/samples/source/` holds the WAV originals. Nothing rewrites them.
- `src/samples/` holds the FLAC files made from them, along with `files.generated.ts` (the list the app imports) and `samples.lock.json` (what was converted, and with which settings). All three are generated and committed.

After adding, replacing or removing a WAV in `src/samples/source/`, run:

```bash
pnpm optimize-samples
```

This needs [ffmpeg](https://ffmpeg.org) on your machine (`brew install ffmpeg` on macOS). Deploying does not: the FLAC files are committed.

The script only converts what changed, and checks every FLAC it writes against its WAV: 16-bit and 24-bit sources come out bit for bit identical, deeper ones (32-bit integer or float) are rounded to 24 bits. `pnpm test` fails when the committed files no longer match the WAV originals, so a forgotten run does not go unnoticed. The pad labels listed in `src/samples/index.test.ts` are still updated by hand.

## Search engine indexing

The site is private by default: every page and file is served `noindex`, and the landing page shows its "private download page" notice. Two environment variables, documented in `.env.example`, change that:

- `ALLOW_INDEXING=true` makes the landing page indexable, hides the notice, and lists the page in `sitemap.xml`. `/sandbox` and the sample pack zip stay `noindex` either way.
- `SITE_URL` is the public origin of the site. The build fails when indexing is on without it.

Both are read at build time, so changing them needs a new build.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
