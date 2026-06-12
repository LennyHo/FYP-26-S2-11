export const QUICK_PROMPTS = [
  'What should I try today?',
  'Show me low sugar options',
  'Which drink has the least calories?',
  'Recommend a healthier drink',
];

export function createConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function convertDrinkNamesToLinks(text: string, menuLookup: Record<string, { id: string; category: string }> = {}): string {
  let result = text;

  Object.entries(menuLookup).forEach(([drinkName, { id, category }]) => {
    const url = `/menu/${category}/${id}`;
    
    // Handle **Drink Name** format
    const boldPattern = new RegExp(`\\*\\*${drinkName}\\*\\*`, 'g');
    result = result.replace(boldPattern, `<a href="${url}" class="chat-drink-link" style="color: #2b7da3; text-decoration: none; border-bottom: 2px solid #2b7da3; font-weight: bold;"><strong>${drinkName}</strong></a>`);
    
    // Handle ***Drink Name*** format
    const boldItalicPattern = new RegExp(`\\*\\*\\*${drinkName}\\*\\*\\*`, 'g');
    result = result.replace(boldItalicPattern, `<a href="${url}" class="chat-drink-link" style="color: #2b7da3; text-decoration: none; border-bottom: 2px solid #2b7da3; font-weight: bold;"><strong>${drinkName}</strong></a>`);
  });
  
  return result;
}

export function parseDrinkFromHtml(html: string) {
  try {
    const imageMatch = html.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/i);
    const altMatch = html.match(/<img[^>]+alt=['"]([^'"]+)['"][^>]*>/i);
    const nameMatch =
      html.match(/\*\*([^*]+)\*\*\s*\(\$?([^)]+)\)/) ||
      html.match(/<strong>([^<]+)<\/strong>\s*\(\$?([^)]+)\)/i);
    const statsMatch = html.match(/Nutri\s*Grade:\s*([A-F])\s*\|\s*Sugar:\s*([^|<\n]+?)g?\s*\|\s*Calories:\s*([^<\n]+?)(?:\s*kcal)?(?:<|$)/i);
    const idMatch =
      html.match(/startOrder\((?:\\?["'])([^"')\\]+)(?:\\?["'])\)/i) ||
      html.match(/data-drink-id=['"]([^'"]+)['"]/i);

    if (!nameMatch || !statsMatch || !idMatch) {
      return null;
    }

    return {
      id: idMatch[1],
      name: nameMatch[1]?.trim() || altMatch?.[1]?.trim() || 'Recommended drink',
      image: imageMatch?.[1] || `/img/bubble_teas/${idMatch[1]}.jpg`,
      price: nameMatch[2].trim(),
      grade: statsMatch[1].trim(),
      sugar: statsMatch[2].trim(),
      calories: statsMatch[3].trim(),
    };
  } catch (e) {
    return null;
  }
}


