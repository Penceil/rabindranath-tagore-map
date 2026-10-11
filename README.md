# The Journey: Sarong to Sari (client demo)

A stand-alone preview of **The Journey**, the animated map of Rabindranath Tagore's
1927 voyage to Java and Bali, built for the Sarong to Sari microsite. It exists
only so the client can review the map; the microsite itself lives in the main
repository (`weavers-studio`), where this page is `/microsite/the-journey`.

## Run it

Same toolchain as the main repository: Node 18.14.0 and Yarn 1.22.22.

```bash
yarn install
yarn dev
```

Then open http://localhost:3000. Each date has its own link, for example
http://localhost:3000/#borobudur.

## Keeping it in step with the main site

The files keep the main repository's paths, so an update there can be copied
across as it is:

- `app/components/microsite/components/journey/` — the map, timeline, cards and camera
- `app/components/microsite/data/journey.ts` — every date, card text, photo crop and map position
- `public/images/sarong-to-sari/journey/` — the map layers, markers and photographs

What differs here: the page is served at `/` (`app/page.tsx`), the header's other
links are shown without going anywhere (`data/navigation.ts`, `MicrositeHeader.tsx`),
the layout has no toast provider, and `data/home.ts` holds only the image path.
The page also asks search engines not to index it.

## Deploying

Vercel detects the Next.js app with no settings needed. Each push to `main`
redeploys the preview.
