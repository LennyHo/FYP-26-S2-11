export default function LoginPage() {
  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, border: '1px solid #eee', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>DripTea Login</h1>
      <form>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 8 }}>Email</label>
          <input type="email" id="email" name="email" required style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 8 }}>Password</label>
          <input type="password" id="password" name="password" required style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: 10, background: '#7b3ff2', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold', fontSize: 16 }}>
          Login
        </button>
      </form>
    </div>
  );
}
