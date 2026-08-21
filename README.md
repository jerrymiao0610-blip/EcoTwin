# EcoTwin

EcoTwin is an educational classroom energy simulation for NextStep Hacks 2026.
It provides estimates, not measured data or professional building-energy modelling.

## Task 01: simulation engine

The reusable engine is in `src/lib/simulation`:

```ts
import {
  DEFAULT_CLASSROOM_CONFIG,
  simulateClassroomEnergy,
} from "@/lib/simulation";

const estimate = simulateClassroomEnergy(DEFAULT_CLASSROOM_CONFIG);
```

The model calculates daily lighting, device, and HVAC electricity use, then
scales these using the classroom's configurable operating days (22 per month
and 250 per year in the demo defaults). Cost and CO2 use the caller-provided
electricity price and carbon intensity. HVAC assumptions are deliberately
visible in `constants.ts`: the cooling load combines outdoor temperature
difference and occupancy heat, then divides by an illustrative COP.

The Eco Score is a deterministic teaching indicator: it begins at 100 and
subtracts clear penalties for lighting above 70%, lighting density above 8 W/m²,
a thermostat below 24°C when HVAC is enabled, and device power above 75 W per
occupant. Outdoor temperature affects energy use but not this score. It is not
a sustainability certification.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
