// Centralized API utility for frontend
// You can add more functions as needed

export async function fetchFromApi(endpoint, options = {}) {
  const baseUrls = [
    'http://localhost:5000',
    process.env.NEXT_PUBLIC_DRIPTEA_API_BASE,
    'https://driptea-trrn.onrender.com',
  ]
    .filter(Boolean)
    .map((value) => value.replace(/\/$/, ''))
    .filter((value, index, values) => values.indexOf(value) === index);

  let lastError = 'API error';

  for (const baseUrl of baseUrls) {
    let shouldTryNext = false;

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, options);
      if (response.ok) {
        return response.json();
      }

      lastError = `API error: ${response.status}`;
      shouldTryNext = response.status >= 500;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'API error';
      shouldTryNext = true;
    }

    if (!shouldTryNext) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError);
}

// Example: GET request
export async function getMenu() {
  return fetchFromApi('/api/menu-items');
}

// Example: POST request
export async function postOrder(orderData) {
  return fetchFromApi('/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
}
