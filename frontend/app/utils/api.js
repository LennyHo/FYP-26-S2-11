// Centralized API utility for frontend
// You can add more functions as needed

export async function fetchFromApi(endpoint, options = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'; // Change as needed
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

// Example: GET request
export async function getMenu() {
  return fetchFromApi('/api/menu');
}

// Example: POST request
export async function postOrder(orderData) {
  return fetchFromApi('/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
}
