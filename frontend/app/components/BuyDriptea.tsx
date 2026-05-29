import Header from '../components/Header';
import styles from './BuyDriptea.module.css';
import Link from 'next/link';

const products = [
  {
    name: 'Brown Sugar Velvet',
    price: 'S$ 4.80',
    note: 'Thick milk tea, caramel depth, chewy pearls.',
    tone: 'brown',
    // done by "HDC" - featured cards now lead to actual add-to-cart flow.
    categorySlug: 'milk-tea',
    drinkId: 'b001',
    // end done by "HDC"
  },
  {
    name: 'Ruby Strawberry Tea',
    price: 'S$ 4.50',
    note: 'Bright fruit tea with a soft lychee finish.',
    tone: 'red',
    // done by "HDC" - featured cards now lead to actual add-to-cart flow.
    categorySlug: 'matcha-teas',
    drinkId: 'b007',
    // end done by "HDC"
  },
  {
    name: 'Matcha Cloud Cream',
    price: 'S$ 5.20',
    note: 'Earthy matcha layered with a smooth cream top.',
    tone: 'green',
    // done by "HDC" - featured cards now lead to actual add-to-cart flow.
    categorySlug: 'matcha-teas',
    drinkId: 'b006',
    // end done by "HDC"
  },
];

const categories = [
  { name: 'Milk Tea', image: '/menu-milk-tea.jpg', slug: 'milk-tea' },
  { name: 'Matcha Teas', image: '/menu-matcha.jpg', slug: 'matcha-teas' },
  { name: 'Ice Blended', image: '/menu-ice-blended.jpg', slug: 'ice-blended' },
  { name: 'Local Favourites', image: '/menu-local.jpg', slug: 'local-favourites' },
];

const customSteps = ['Pick your tea base', 'Choose your sweetness', 'Add pearls or toppings'];

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
                <div className={styles.cardTop}>
                  <span className={styles.cardTag}>Best seller</span>
                  <span className={styles.cardPrice}>{product.price}</span>
                </div>
                <div className={styles.cardVisual} />
                <h3>{product.name}</h3>
                <p>{product.note}</p>
                {/* done by "HDC" - do not send users to an empty cart; send them to the real add page. */}
                <Link href={`/menu/${product.categorySlug}/${product.drinkId}`} className={styles.cardLink}>
                  Customize & add
                </Link>
                {/* end done by "HDC" */}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.splitSection}>
          <div className={styles.bundlePanel}>
            <p className={styles.sectionEyebrow}>Build your cup</p>
            <h2>Simple ordering flow</h2>
            <div className={styles.stepList}>
              {customSteps.map((step, index) => (
                <div key={step} className={styles.stepItem}>
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.offerPanel}>
            <p className={styles.sectionEyebrow}>Today's offer</p>
            <h2>2 drinks, 1 calm add-on</h2>
            <p>
              Add two signature drinks to the cart and unlock a smooth bundle-ready presentation
              for the next checkout step.
            </p>
            <Link href="/cart" className={styles.offerAction}>
              Go to cart
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
                className={styles.categoryCard}
              >
                <div className={styles.categoryVisual}>
                  <div className={styles.placeholderImg}>Image for {cat.name}</div>
                </div>
                <h3>{cat.name}</h3>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
