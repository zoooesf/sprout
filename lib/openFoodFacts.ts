export interface FoodProduct {
  name: string;
  brand: string | null;
  ingredients: string[];
}

export async function lookupBarcode(barcode: string): Promise<FoodProduct | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,ingredients_text`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const ingredients: string[] = p.ingredients_text
      ? p.ingredients_text
          .replace(/\([^)]*\)/g, '')
          .split(/[,;]/)
          .map((s: string) => s.replace(/^\s*[-*_•]+\s*/, '').trim())
          .filter((s: string) => s.length > 1 && !/^\d+%?$/.test(s))
      : [];

    return {
      name: p.product_name || '',
      brand: p.brands || null,
      ingredients,
    };
  } catch (err) {
    clearTimeout(timer);
    console.warn('[openFoodFacts] lookup failed:', err);
    return null;
  }
}
