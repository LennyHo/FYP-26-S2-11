"use client";

// done by "HDC" - minimal fake payment page that calls backend orders/payments checkout.
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { checkoutCart, getCartItems, getStoredUser, parseLocalCartLine, type DripTeaCartItem } from '../utils/dripteaApi';

type CheckoutItem = {
  name: string;
  details: string;
  price: number;
};

type Confirmation = {
  orderId: string;
  paymentStatus: string;
  total: number;
};

function parseLocalCart(): CheckoutItem[] {
  if (typeof window === 'undefined') return [];

  const savedData = window.localStorage.getItem("dripTeaCartData");
  if (!savedData) return [];

  return savedData
    .split('\n')
    .map((line) => {
      // done by "HDC" - parse local cart rows even when details contain pipe characters.
      const parsedCartLine = parseLocalCartLine(line);
      if (parsedCartLine) {
        return {
          name: parsedCartLine.name,
          details: parsedCartLine.details,
          price: parsedCartLine.price,
        };
      }
      // end done by "HDC"
      const parts = line.split('|');
      if (parts.length < 3) return null;

      const price = Number(parts[2].replace(/[^0-9.]/g, ''));
      if (Number.isNaN(price)) return null;

      return {
        name: parts[0].replace(/\s*\([^)]*\)\s*$/, '').trim(),
        details: parts[1].trim(),
        price,
      };
    })
    .filter((item): item is CheckoutItem => Boolean(item));
}

function fromBackendCart(items: DripTeaCartItem[]): CheckoutItem[] {
  return items.map((item) => {
    const toppings = Array.isArray(item.customization?.toppings)
      ? (item.customization.toppings as string[]).join(', ')
      : '';
    const details = [
      item.quantity ? `Qty ${item.quantity}` : '',
      typeof item.customization?.size === 'string' ? item.customization.size : '',
      typeof item.customization?.ice === 'string' ? item.customization.ice : '',
      typeof item.customization?.sugar === 'string' ? item.customization.sugar : '',
      toppings,
    ].filter(Boolean).join(' | ');

    return {
      name: item.name,
      details,
      price: Number(item.lineTotal || 0),
    };
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('fake_card');
  const [voucherCode, setVoucherCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    const loadCheckoutCart = async () => {
      const currentUser = getStoredUser();

      if (currentUser) {
        try {
          const response = await getCartItems(currentUser.id);
          // done by "HDC" - backend cart is the source of truth for logged-in checkout.
          setItems(fromBackendCart(response.data));
          return;
          // end done by "HDC"
        } catch (error) {
          console.error('[DripTea checkout cart]', error);
        }
      }

      setItems(parseLocalCart());
    };

    void loadCheckoutCart();
  }, []);

  const handleFakePayment = async () => {
    setStatusMessage('');
    setIsProcessing(true);

    try {
      const currentUser = getStoredUser();

      if (currentUser) {
        const result = await checkoutCart(currentUser.id, paymentMethod, voucherCode ? voucherCode.trim() : undefined);
        window.localStorage.removeItem("dripTeaCartData");
        window.dispatchEvent(new Event('cartUpdated'));
        setItems([]);
        setConfirmation({
          orderId: result.order.id,
          paymentStatus: result.payment.status,
          total: result.order.totalAmount,
        });
        return;
      }

      const fakeOrderId = `GUEST-${Date.now().toString(36).toUpperCase()}`;
      window.localStorage.removeItem("dripTeaCartData");
      window.dispatchEvent(new Event('cartUpdated'));
      setItems([]);
      setConfirmation({
        orderId: fakeOrderId,
        paymentStatus: 'paid',
        total,
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Payment failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F0' }}>
      <Header />
      <main style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 72px' }}>
        <button
          type="button"
          onClick={() => router.push('/cart')}
          style={{ border: 'none', background: 'transparent', color: '#8d633f', fontWeight: 700, cursor: 'pointer', marginBottom: 18 }}
        >
          Back to cart
        </button>

        <section style={{ background: '#fff', border: '1px solid rgba(220, 199, 180, 0.85)', borderRadius: 18, padding: 28 }}>
          <p style={{ color: '#8d633f', fontWeight: 800, letterSpacing: 0, margin: '0 0 8px' }}>Checkout</p>
          <h1 style={{ margin: '0 0 24px', color: '#2c1810' }}>Fake payment</h1>

          {confirmation ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <h2 style={{ margin: 0, color: '#1f5f2b' }}>Payment successful</h2>
              <p style={{ margin: 0 }}>Order ID: {confirmation.orderId}</p>
              <p style={{ margin: 0 }}>Payment status: {confirmation.paymentStatus}</p>
              <p style={{ margin: 0, fontWeight: 800 }}>Total paid: S$ {confirmation.total.toFixed(2)}</p>
              <button
                type="button"
                onClick={() => router.push('/buy-driptea')}
                style={{ marginTop: 12, width: 'fit-content', border: 'none', borderRadius: 10, padding: '12px 18px', background: '#8d633f', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              >
                Continue ordering
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                {items.length === 0 ? (
                  <p style={{ margin: 0 }}>Your cart is empty.</p>
                ) : (
                  items.map((item, index) => (
                    <div key={`${item.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid rgba(220, 199, 180, 0.55)', paddingBottom: 12 }}>
                      <div>
                        <strong>{item.name}</strong>
                        <p style={{ margin: '4px 0 0', color: '#6f625c' }}>{item.details}</p>
                      </div>
                      <strong>S$ {item.price.toFixed(2)}</strong>
                    </div>
                  ))
                )}
              </div>

              <label style={{ display: 'grid', gap: 8, maxWidth: 320, fontWeight: 700 }}>
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(141, 99, 63, 0.35)' }}
                >
                  <option value="fake_card">Fake card</option>
                  <option value="fake_wallet">Fake wallet</option>
                  <option value="fake_counter">Pay at counter</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: 8, maxWidth: 320, fontWeight: 700 }}>
                Voucher code (optional)
                <input
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="Enter voucher code"
                  style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(141, 99, 63, 0.35)' }}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 24 }}>Total: S$ {total.toFixed(2)}</strong>
                <button
                  type="button"
                  onClick={handleFakePayment}
                  disabled={items.length === 0 || isProcessing}
                  style={{ border: 'none', borderRadius: 12, padding: '14px 22px', background: items.length === 0 ? '#c7b8aa' : '#1f5f2b', color: '#fff', fontWeight: 900, cursor: items.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  {isProcessing ? 'Processing...' : 'Pay with fake payment'}
                </button>
              </div>

              {statusMessage && (
                <p role="alert" style={{ margin: 0, color: '#b42318', fontWeight: 700 }}>
                  {statusMessage}
                </p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
// end done by "HDC"
