import Header from '../components/Header';
import styles from './BuyDriptea.module.css';
import Link from 'next/link';

const products = [
  {
    name: 'Brown Sugar Velvet',
    price: 'S$ 4.80',
    note: 'Thick milk tea, caramel depth, chewy pearls.',
    tone: 'brown',
  },
  {
    name: 'Ruby Strawberry Tea',
    price: 'S$ 4.50',
    note: 'Bright fruit tea with a soft lychee finish.',
    tone: 'red',
  },
  {
    name: 'Matcha Cloud Cream',
    price: 'S$ 5.20',
    note: 'Earthy matcha layered with a smooth cream top.',
    tone: 'green',
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
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Fresh drops. Calm indulgence.</p>
            <h1 className={styles.title}>BUY DRIPTEA</h1>
            <p className={styles.description}>
              A static visual shopping page for DripTea drinks, built to showcase the brand
              experience before checkout.
            </p>

            <div className={styles.actions}>
              <Link className={styles.primaryAction} href="/cart">
                View Cart
              </Link>
              <Link className={styles.secondaryAction} href="/our-story">
                Read Our Story
              </Link>
            </div>

            <div className={styles.metaRow}>
              <div>
                <span className={styles.metaLabel}>Starting from</span>
                <strong className={styles.metaValue}>S$ 4.20</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Pickup ready</span>
                <strong className={styles.metaValue}>12 min</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Popular add-on</span>
                <strong className={styles.metaValue}>Pearl topping</strong>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.imageCard}>
              <span className={styles.imageBadge}>Signature collection</span>
              <img
                src="/driptea_drinks.jpg"
                alt="Assorted DripTea drinks in a premium display"
                className={styles.heroImage}
              />
            </div>
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
                <Link href="/cart" className={styles.cardLink}>
                  Add to cart
                </Link>
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
