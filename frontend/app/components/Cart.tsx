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

const drinkNameToId: Record<string, { id: string; category: string }> = {
  "Classic Milk Tea": { id: "b001", category: "milk-tea" },
  "Jasmine Green Tea": { id: "b002", category: "milk-tea" },
  "Oolong Milk Tea": { id: "b003", category: "milk-tea" },
  "Osmanthus Milk Tea": { id: "b004", category: "milk-tea" },
  "Da Hong Bao Milk Tea": { id: "b005", category: "milk-tea" },
  "Matcha Latte": { id: "b006", category: "matcha-teas" },
  "Strawberry Matcha Tea": { id: "b007", category: "matcha-teas" },
  "Cranberry Matcha Tea": { id: "b008", category: "matcha-teas" },
  "Jasmine Matcha Tea": { id: "b009", category: "matcha-teas" },
  "Double Chocolate Frappe": { id: "b010", category: "ice-blended" },
  "Taro Slush": { id: "b012", category: "ice-blended" },
  "Milo Dinosaur": { id: "b011", category: "local-favourites" },
};

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
          let name = parts[0].trim();
          // Extract just the drink name without customization details in parentheses
          const nameMatch = name.match(/^([^(]+)/);
          if (nameMatch) {
            name = nameMatch[1].trim();
          }
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

  const removeItem = (index: number) => {
    const updatedItems = cartItems.filter((_, i) => i !== index);
    setCartItems(updatedItems);
    
    // Update localStorage and total
    const newTotal = updatedItems.reduce((sum, item) => sum + item.price, 0);
    setTotal(newTotal);
    
    // Save to localStorage
    const updatedCartData = updatedItems
      .map(item => `${item.name}|${item.details}|S$ ${item.price.toFixed(2)}${item.imageSrc ? `|${item.imageSrc}` : ''}`)
      .join('\n');
    localStorage.setItem("dripTeaCartData", updatedCartData);
    
    // Trigger event for other components
    window.dispatchEvent(new Event('cartUpdated'));
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
          cartItems.map((item, index) => {
            const drinkInfo = drinkNameToId[item.name];
            return (
            <div key={index} className="cart-item-row">
              <div className="item-info">
                <div className="cart-item-details">
                  {drinkInfo ? (
                    <h3><a href={`/menu/${drinkInfo.category}/${drinkInfo.id}`} className="drink-link">{item.name}</a></h3>
                  ) : (
                    <h3>{item.name}</h3>
                  )}
                  <p>{item.details}</p>
                </div>
              </div>
              <div className="cart-item-price">S$ {item.price.toFixed(2)}</div>
              <button 
                onClick={() => removeItem(index)} 
                className="remove-btn"
                title="Remove from cart"
              >
                Remove
              </button>
            </div>
          );
          })
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