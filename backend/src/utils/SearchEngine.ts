export class SearchEngine {
  private static stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "with", "to", "for", "of", "is", "are"
  ]);

  private static synonymMap: Record<string, string[]> = {
    cheap: ["low", "budget", "affordable", "economical"],
    expensive: ["costly", "premium", "high"],
    spicy: ["hot", "chilli", "masala"],
    sweet: ["dessert", "sugar", "mithai"],
    snack: ["fastfood", "quick", "light", "bites"],
    veg: ["vegetarian", "green"],
    nonveg: ["chicken", "meat", "egg", "mutton"],
  };

  public static tokenize(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0 && !this.stopWords.has(word));
  }

  public static expandQuery(tokens: string[]): string[] {
    const expandedSet = new Set<string>();
    for (const token of tokens) {
      expandedSet.add(token);
      if (this.synonymMap[token]) {
        this.synonymMap[token].forEach((syn) => expandedSet.add(syn));
      }
    }
    return Array.from(expandedSet);
  }

  public static extractIntents(query: string) {
    const normalized = query.toLowerCase();
    const intents: { maxPrice?: number; minPrice?: number; isVeg?: boolean } = {};

    const underMatch = normalized.match(/(?:under|below|max)\s*(\d+)/);
    if (underMatch) intents.maxPrice = parseInt(underMatch[1] as string, 10);

    const aboveMatch = normalized.match(/(?:above|over|min)\s*(\d+)/);
    if (aboveMatch) intents.minPrice = parseInt(aboveMatch[1] as string, 10);

    return intents;
  }

  public static fuzzyMatch(word1: string, word2: string, maxDistance: number = 2): number {
    if (Math.abs(word1.length - word2.length) > maxDistance) return -1;

    const dp: number[][] = Array.from({ length: word1.length + 1 }, () => Array(word2.length + 1).fill(0));

    for (let i = 0; i <= word1.length; i++) dp[i]![0] = i;
    for (let j = 0; j <= word2.length; j++) dp[0]![j] = j;

    for (let i = 1; i <= word1.length; i++) {
      for (let j = 1; j <= word2.length; j++) {
        const cost = word1[i - 1] === word2[j - 1] ? 0 : 1;
        dp[i]![j] = Math.min(
          dp[i - 1]?.[j] ?? 0 + 1,       
          dp[i]?.[j - 1] ?? 0 + 1,       
          dp[i - 1]?.[j - 1] ?? 0 + cost 
        );
      }
    }

    const dist = dp[word1.length]?.[word2.length] ?? 0;
    return dist <= maxDistance ? dist : -1;
  }

  public static scoreProduct(product: any, searchTokens: string[], originalQuery: string): number {
    let score = 0;
    
    const name = (product.name || "").toLowerCase();
    const desc = (product.description || "").toLowerCase();
    const shopType = (product.vendor?.shopType || "").toLowerCase();

    if (name.includes(originalQuery.toLowerCase())) score += 50;

    const nameWords = name.split(/\s+/);

    for (const token of searchTokens) {
      if (nameWords.includes(token)) {
        score += 15; 
        continue; 
      }
      if (desc.includes(token)) score += 5;
      if (shopType.includes(token)) score += 8;

      if (name.startsWith(token)) score += 10;
      else if (nameWords.some((nw: string) => nw.startsWith(token))) score += 7;

      if (token.length > 3) {
        for (const nw of nameWords) {
          if (nw.length < 3) continue; 
          const dist = this.fuzzyMatch(token, nw, 2);
          if (dist === 1) score += 5;       
          else if (dist === 2) score += 2;  
        }
      }
    }

    if (searchTokens.includes("cheap") && product.price < 100) score += 10;
    if (searchTokens.includes("expensive") && product.price >= 300) score += 10;
    if (product.stock > 0) score += 2; 

    return score;
  }
}