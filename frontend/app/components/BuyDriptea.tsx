import Header from '../components/Header';
import styles from './BuyDriptea.module.css';
import Link from 'next/link';
import Image from 'next/image';

const products = [
  {
    name: 'Classic Milk Tea',
    price: 'S$ 4.50',
    note: 'Our signature premium black tea blended with rich milk.',
    tone: 'brown',
    image: '/img/bubble_teas/b001.png',
    // done by "HDC" - featured cards now lead to actual add-to-cart flow.
    categorySlug: 'milk-tea',
    drinkId: 'b001',
    // end done by "HDC"
  },
  {
    name: 'Strawberry Matcha Tea',
    price: 'S$ 6.00',
    note: 'Fresh strawberry puree layered with premium matcha.',
    tone: 'red',
    image: '/img/bubble_teas/b007.png',
    // done by "HDC" - featured cards now lead to actual add-to-cart flow.
    categorySlug: 'matcha-teas',
    drinkId: 'b007',
    // end done by "HDC"
  },
  {
    name: 'Matcha Latte',
    price: 'S$ 5.50',
    note: 'Ceremonial grade Uji matcha layered with fresh milk.',
    tone: 'green',
    image: '/img/bubble_teas/b006.png',
    // done by "HDC" - featured cards now lead to actual add-to-cart flow.
    categorySlug: 'matcha-teas',
    drinkId: 'b006',
    // end done by "HDC"
  },
];

const categories = [
  { name: 'Milk Tea', slug: 'milk-tea', tone: 'catBrown', emoji: '🧋' },
  { name: 'Matcha Teas', slug: 'matcha-teas', tone: 'catGreen', emoji: '🍵' },
  { name: 'Ice Blended', slug: 'ice-blended', tone: 'catBlue', emoji: '🧊' },
  { name: 'Local Favourites', slug: 'local-favourites', tone: 'catGold', emoji: '⭐' },
];

const customSteps = [
  { icon: '🍵', title: 'Pick your tea base', desc: 'Choose from milk teas, matcha, fruit teas and more.' },
  { icon: '🍬', title: 'Choose your sweetness', desc: 'Set your sugar level from 0% to 100%.' },
  { icon: '🧆', title: 'Add pearls or toppings', desc: 'Finish with tapioca pearls, grass jelly, or pudding.' },
];

export default function BuyDripTeaPage() {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <video
            className={styles.heroBackgroundVideo}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            // Mobile autoplay fix
            ref={el => {
              if (el && typeof window !== 'undefined') {
                const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile) {
                  el.setAttribute('autoplay', 'true');
                  el.play().catch(() => {});
                }
              }
            }}
          >
            <source src="/buy_driptea_2.mp4" type="video/mp4" />
          </video>
          <div className={styles.heroOverlay} />

          <div className={styles.heroCopy}>
            <h1 className={styles.title}>Refresh Your Day</h1>
            <p className={styles.description}>
              Explore bold flavors and soothing blends. Find your new favorite DripTea now!
            </p>

            {/* Actions and meta removed for a cleaner hero */}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>Featured drinks</p>
            <h2>Choose a visual favorite</h2>
          </div>

          <div className={styles.cardGrid}>
            {products.map((product) => (
              <article key={product.name} className={`${styles.productCard} ${styles[product.tone]}`}>
                <div className={styles.cardVisual}>
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className={styles.cardImage}
                    sizes="(max-width: 960px) 100vw, 33vw"
                  />
                  <span className={styles.cardTag}>★ Best seller</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardMeta}>
                    <h3 className={styles.cardName}>{product.name}</h3>
                    <span className={styles.cardPrice}>{product.price}</span>
                  </div>
                  <p className={styles.cardNote}>{product.note}</p>
                  {/* done by "HDC" - do not send users to an empty cart; send them to the real add page. */}
                  <Link href={`/menu/${product.categorySlug}/${product.drinkId}`} className={styles.cardLink}>
                    Customize &amp; add →
                  </Link>
                  {/* end done by "HDC" */}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.splitSection}>
          <div className={styles.bundlePanel}>
            <p className={styles.sectionEyebrow}>How it works</p>
            <h2>Build your perfect cup</h2>
            <div className={styles.stepList}>
              {customSteps.map((step, index) => (
                <div key={step.title} className={styles.stepItem}>
                  <div className={styles.stepLeft}>
                    <div className={styles.stepNumberWrap}>
                      <span className={styles.stepNumber}>{index + 1}</span>
                      {index < customSteps.length - 1 && <span className={styles.stepConnector} />}
                    </div>
                  </div>
                  <div className={styles.stepContent}>
                    <span className={styles.stepIcon}>{step.icon}</span>
                    <div>
                      <p className={styles.stepTitle}>{step.title}</p>
                      <p className={styles.stepDesc}>{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/menu/milk-tea" className={styles.offerAction} style={{ marginTop: '8px', width: 'fit-content' }}>
              Start ordering →
            </Link>
          </div>

          <div className={styles.offerPanel}>
            <div className={styles.offerBadge}>Limited time</div>
            <p className={styles.sectionEyebrow}>Today's offer</p>
            <h2>2 drinks, 1 calm add-on</h2>
            <p>
              Add two signature drinks to your cart and unlock a free topping upgrade on your next checkout.
            </p>
            <Link href="/cart" className={styles.offerAction}>
              Go to cart →
            </Link>
          </div>
        </section>

        {/* OUR MENU CATEGORIES SECTION */}
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>Explore by Category</p>
            <h2>Our Menu</h2>
          </div>

          <div className={styles.cardGrid}>
            {categories.map((cat) => (
              <Link
                href={`/menu/${cat.slug}`}
                key={cat.name}
                className={`${styles.categoryCard} ${styles[cat.tone]}`}
              >
                <div className={styles.categoryVisual}>
                  <span className={styles.categoryEmoji}>{cat.emoji}</span>
                </div>
                <div className={styles.categoryFooter}>
                  <h3>{cat.name}</h3>
                  <span className={styles.categoryArrow}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/*
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>Frequently Asked Questions</p>
            <h2>FAQ</h2>
          </div>
          Add FAQ content here if needed
        </section>
        */}
      </main>
    </div>
  );
}
