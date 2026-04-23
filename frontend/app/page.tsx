import Header from './components/Header';
import Hero from './components/Hero';
import MeetTheCrew from './components/MeetTheCrew';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }} className="smooth-scroll">
      <Header />
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Hero />
        <MeetTheCrew />
      </div>
    </div>
  );
}

