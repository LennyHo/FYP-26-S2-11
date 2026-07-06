import { Geist } from 'next/font/google';
import type { Metadata } from 'next';
import styles from './marketing.module.css';
import MarketingHero from './components/MarketingHero';
import ShopSection from './components/ShopSection';
import AvyConcierge from './components/AvyConcierge';

// Matches the font used by the live product (view/app/layout.tsx) so the
// marketing preview reads as the same brand.
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  title: 'DripTea: Bubble Tea, Ordered by Avy',
  description:
    "DripTea is a bubble tea shop with an AI concierge named Avy. Tell her what you're craving, she remembers your order, and you skip the queue.",
};

export default function MarketingPage() {
  return (
    <div className={`${styles.root} ${geistSans.variable}`}>
      <main>
        <MarketingHero />
        <ShopSection />
        <AvyConcierge />
      </main>
    </div>
  );
}
