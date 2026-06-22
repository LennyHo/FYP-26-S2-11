export interface GlossaryEntry {
  term: string;
  description: string;
  details?: { label: string; value: string }[];
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'tapioca starch': {
    term: 'Tapioca Starch',
    description: 'A fine white powder extracted from cassava root. It is the key ingredient used to make tapioca pearls and acts as a thickener in many bubble tea recipes.',
    details: [
      { label: 'Source', value: 'Cassava root' },
      { label: 'Calories', value: '358 Kcal / 100g' },
      { label: 'Carbohydrates', value: '88g / 100g' },
      { label: 'Fat', value: '~0g' },
      { label: 'Protein', value: '~0.2g / 100g' },
      { label: 'Used In', value: 'Boba pearls, thickeners, desserts' },
    ],
  },
  'tapioca pearls': {
    term: 'Tapioca Pearls',
    description: 'Small, chewy spheres made from tapioca starch, often cooked in brown sugar syrup for a sweet, caramel-like flavour. The classic bubble tea topping.',
    details: [
      { label: 'Base', value: 'Tapioca starch' },
      { label: 'Texture', value: 'Chewy (QQ)' },
      { label: 'Colour', value: 'Black (brown sugar) or clear' },
      { label: 'Calories', value: '~100 Kcal / serving' },
    ],
  },
  'popping pearls': {
    term: 'Popping Pearls',
    description: 'Juice-filled spheres with a thin gel shell that burst with fruity flavour when bitten. Made using spherification — a popular modern topping.',
    details: [
      { label: 'Also known as', value: 'Popping boba, bursting pearls' },
      { label: 'Filling', value: 'Fruit juice' },
      { label: 'Texture', value: 'Pops on bite' },
      { label: 'Common flavours', value: 'Strawberry, mango, lychee' },
    ],
  },
  'aloe vera': {
    term: 'Aloe Vera',
    description: 'Translucent jelly cubes cut from the inner gel of aloe vera leaves. Mild in flavour and refreshing in texture — a popular low-calorie topping with hydration benefits.',
    details: [
      { label: 'Texture', value: 'Soft jelly' },
      { label: 'Calories', value: '~4 Kcal / 100g' },
      { label: 'Benefits', value: 'Hydration, low-calorie' },
      { label: 'Flavour', value: 'Mild, slightly sweet' },
    ],
  },
  'oat milk': {
    term: 'Oat Milk',
    description: 'A plant-based milk alternative made from blended oats and water. Naturally creamy, slightly sweet, and lactose-free — a popular dairy-free base for bubble tea.',
    details: [
      { label: 'Base', value: 'Oats + water' },
      { label: 'Calories', value: '~45 Kcal / 100ml' },
      { label: 'Lactose', value: 'Lactose-free' },
      { label: 'Taste', value: 'Mild, creamy, slightly sweet' },
    ],
  },
  'brown sugar': {
    term: 'Brown Sugar',
    description: 'Unrefined sugar that retains its molasses, giving it a deep caramel flavour and dark amber colour. Used to coat tapioca pearls and create the signature "tiger stripe" drink.',
    details: [
      { label: 'Calories', value: '380 Kcal / 100g' },
      { label: 'Flavour', value: 'Caramel, rich, molasses' },
      { label: 'Colour', value: 'Dark amber' },
      { label: 'Used In', value: 'Pearl coating, syrups, tiger stripe drinks' },
    ],
  },
  'matcha': {
    term: 'Matcha',
    description: 'Finely ground powder of shade-grown green tea leaves. Earthy and slightly bitter, matcha pairs beautifully with milk and is rich in antioxidants and L-theanine.',
    details: [
      { label: 'Origin', value: 'Japan' },
      { label: 'Caffeine', value: '~35mg per serving' },
      { label: 'Antioxidants', value: 'High (catechins, L-theanine)' },
      { label: 'Colour', value: 'Vivid green' },
    ],
  },
  'taro': {
    term: 'Taro',
    description: 'A tropical root vegetable with a naturally sweet, nutty flavour and a distinctive light purple hue. One of the most beloved bubble tea flavours in Southeast Asia.',
    details: [
      { label: 'Origin', value: 'Southeast Asia' },
      { label: 'Colour', value: 'Light purple' },
      { label: 'Flavour', value: 'Sweet, nutty, vanilla-like' },
      { label: 'Calories', value: '~112 Kcal / 100g' },
    ],
  },
  'lychee': {
    term: 'Lychee',
    description: 'A tropical fruit with sweet, floral, juicy white flesh. Lychee is a favourite bubble tea flavour — especially in fruit teas and popping pearls.',
    details: [
      { label: 'Origin', value: 'Southeast Asia, China' },
      { label: 'Flavour', value: 'Sweet, floral, refreshing' },
      { label: 'Calories', value: '~66 Kcal / 100g' },
      { label: 'Used In', value: 'Fruit teas, popping pearls, syrups' },
    ],
  },
  'nutri-grade': {
    term: 'Nutri-Grade',
    description: "Singapore's mandatory nutritional grading system for drinks. Grades run from A (healthiest) to D (least healthy), based on sugar and saturated fat content.",
    details: [
      { label: 'Grade A', value: 'Low sugar & fat — healthiest' },
      { label: 'Grade B', value: 'Moderate sugar & fat' },
      { label: 'Grade C', value: 'Higher sugar or fat' },
      { label: 'Grade D', value: 'High sugar — least healthy' },
      { label: 'Mandated by', value: 'Singapore HPB' },
    ],
  },
  'caffeine': {
    term: 'Caffeine',
    description: 'A natural stimulant present in tea and coffee. Caffeine content in bubble tea depends on the tea base — black tea has more than green tea, while fruit teas are typically caffeine-free.',
    details: [
      { label: 'Black tea', value: '~47mg / cup' },
      { label: 'Green tea', value: '~28mg / cup' },
      { label: 'Matcha', value: '~35mg / serving' },
      { label: 'Fruit tea', value: '~0mg (caffeine-free)' },
    ],
  },
  'lactose': {
    term: 'Lactose',
    description: 'The natural sugar found in dairy milk. People with lactose intolerance can enjoy bubble tea made with plant-based milks such as oat, almond, or soy milk.',
    details: [
      { label: 'Found in', value: 'Dairy milk, cream, cheese' },
      { label: 'Alternatives', value: 'Oat milk, almond milk, soy milk' },
      { label: 'Intolerance rate', value: '~65% of adults globally' },
    ],
  },
  'longan': {
    term: 'Longan',
    description: 'A small, round tropical fruit similar to lychee, with translucent white flesh and a sweet, musky flavour. Often used in fruit teas and as a topping.',
    details: [
      { label: 'Origin', value: 'Southeast Asia' },
      { label: 'Flavour', value: 'Sweet, musky, honey-like' },
      { label: 'Calories', value: '~60 Kcal / 100g' },
    ],
  },
  'boba': {
    term: 'Boba',
    description: 'Another name for tapioca pearls — the iconic chewy spheres at the bottom of bubble tea. "Boba" also commonly refers to the bubble tea drink itself.',
    details: [
      { label: 'Also known as', value: 'Tapioca pearls, pearls' },
      { label: 'Texture', value: 'Chewy (QQ)' },
      { label: 'Typical size', value: '6–8mm diameter' },
    ],
  },
  'collagen': {
    term: 'Collagen',
    description: 'A protein naturally found in skin, bones, and connective tissue. Collagen powder is sometimes added to bubble tea as a wellness supplement to support skin elasticity and joint health.',
    details: [
      { label: 'Type', value: 'Protein supplement' },
      { label: 'Benefit', value: 'Skin, joints, hair' },
      { label: 'Source', value: 'Marine or bovine collagen' },
    ],
  },
};

// Sorted longest-first so multi-word terms match before single-word subsets
export const GLOSSARY_TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
