"use client";

import React, { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with backend API
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F9F6F0" }}>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Forgot Password</h1>
      {submitted ? (
        <div style={{ color: "#2b7da3", fontSize: 18 }}>
          If an account with that email exists, a reset link has been sent.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, width: 320, maxWidth: "90vw", background: "white", padding: 32, borderRadius: 12, boxShadow: "0 4px 24px rgba(2,23,46,0.08)" }}>
          <label htmlFor="email" style={{ fontWeight: 500 }}>Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: 12, borderRadius: 6, border: "1px solid #ccc", fontSize: 16 }}
            placeholder="you@email.com"
          />
          <button type="submit" style={{ background: "#2b7da3", color: "white", border: "none", borderRadius: 6, padding: "12px 0", fontWeight: 600, fontSize: 16, cursor: "pointer", marginTop: 8 }}>
            Send Reset Link
          </button>
        </form>
      )}
    </div>
  );
}
