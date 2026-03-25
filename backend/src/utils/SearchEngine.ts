export class SearchEngine {
  static tokenize(text: string): string[] {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }

  static extractIntents(query: string) {
    const minPriceMatch = query.match(/above (\d+)|over (\d+)|more than (\d+)/i);
    const maxPriceMatch = query.match(/under (\d+)|below (\d+)|less than (\d+)/i);
    
    return {
      minPrice: minPriceMatch ? Number(minPriceMatch[1] || minPriceMatch[2] || minPriceMatch[3]) : undefined,
      maxPrice: maxPriceMatch ? Number(maxPriceMatch[1] || maxPriceMatch[2] || maxPriceMatch[3]) : undefined,
    };
  }

  static expandQuery(tokens: string[]): string[] {
    // Add basic synonyms or stems here if needed
    return [...new Set(tokens)];
  }

  static scoreProduct(product: any, tokens: string[], rawSearch: string): number {
    const text = `${product.name} ${product.description || ''} ${product.category || ''}`.toLowerCase();
    let score = 0;
    tokens.forEach(token => {
      if (text.includes(token)) score += 1;
    });
    return score;
  }
}