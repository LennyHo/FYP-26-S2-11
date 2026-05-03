"use client";

import React from 'react';
// We go up one level (../) to reach the components folder
import Cart from '../components/Cart'; 

export default function CartPageRoute() {
  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#F9F6F0' }}>
      <Cart />
    </div>
  );
}