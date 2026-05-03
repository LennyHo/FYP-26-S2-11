"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// Use ./ because the CSS is in the same folder as this file
import './Cart.css'; 

interface CartItem {
  name: string;
  details: string;
  price: number;
  imageSrc?: string;
}

export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCartData = () => {
    const savedData = localStorage.getItem("dripTeaCartData");
    if (savedData) {
      const drinks = savedData.split('\n');
      let calculatedTotal = 0;
      const parsedItems: CartItem[] = [];

      drinks.forEach(drinkLine => {
        const parts = drinkLine.split('|');
        if (parts.length >= 3) {
          const name = parts[0].trim();
          const details = parts[1].trim();
          const priceString = parts[2].replace(/[^0-9.]/g, '');
          const price = parseFloat(priceString);
          const imageSrc = parts.length === 4 ? parts[3].trim() : undefined;

          if (!isNaN(price)) {
            calculatedTotal += price;
            parsedItems.push({ name, details, price, imageSrc });
          }
        }
      });
      setCartItems(parsedItems);
      setTotal(calculatedTotal);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCartData();
    window.addEventListener('cartUpdated', fetchCartData);
    return () => window.removeEventListener('cartUpdated', fetchCartData);
  }, []);

  return (
    <div className="cart-page-container">
      {/* 1. Added Back to Home Button */}
      <button onClick={() => router.push('/')} className="back-btn">
        ← Back to Menu
      </button>
      
      <h1 className="page-title">Your Shopping Cart</h1>
      
      <div className="cart-items-list">
        {cartItems.length === 0 ? (
          <p style={{ padding: '20px 0' }}>Your cart is empty.</p>
        ) : (
          cartItems.map((item, index) => (
            <div key={index} className="cart-item-row">
              <div className="item-info">
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  <p>{item.details}</p>
                </div>
              </div>
              <div className="cart-item-price">S$ {item.price.toFixed(2)}</div>
            </div>
          ))
        )}
      </div>

      <div className="cart-footer">
        <div className="cart-total-text">Total: S$ {total.toFixed(2)}</div>
        {/* 2. Added Proceed to Checkout inside the cart page */}
        <button 
          onClick={() => router.push('/checkout')} 
          className="checkout-btn"
          disabled={cartItems.length === 0}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}