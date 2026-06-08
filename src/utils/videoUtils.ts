import DOMPurify from 'dompurify';

export interface ParsedProduct {
  captionText: string;
  productName: string;
  productPrice: number | null; // numeric price
  productUses: string[]; // array of strings (bullet points)
  keySpecifications: string[]; // array of strings
  benefits: string[]; // array of strings
  whyRecommends: string;
  bestFor: string;
  whatILiked: string;
  thingsToKnow: string;
  couponCode: string;
  couponInstructions: string;
  couponTerms: string;
}

export function parseVideoProduct(caption: string | null | undefined): ParsedProduct {
  const defaultProduct: ParsedProduct = {
    captionText: caption || '',
    productName: '',
    productPrice: null,
    productUses: [],
    keySpecifications: [],
    benefits: [],
    whyRecommends: '',
    bestFor: '',
    whatILiked: '',
    thingsToKnow: '',
    couponCode: '',
    couponInstructions: '',
    couponTerms: '',
  };

  if (!caption) return defaultProduct;

  const trimmed = caption.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      
      const parseList = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val.flatMap(item => {
            const s = String(item).trim();
            return s ? [s] : [];
          });
        }
        if (typeof val === 'string') {
          return val
            .split('\n')
            .flatMap(line => {
              const s = line.trim().replace(/^•\s*/, '');
              return s ? [s] : [];
            });
        }
        return [];
      };

      return {
        captionText: data.captionText || '',
        productName: data.product_name || '',
        productPrice: data.product_price ? Number(data.product_price) : null,
        productUses: parseList(data.product_uses),
        keySpecifications: parseList(data.key_specifications),
        benefits: parseList(data.benefits),
        whyRecommends: data.why_recommends || '',
        bestFor: data.best_for || '',
        whatILiked: data.what_liked || '',
        thingsToKnow: data.things_know || '',
        couponCode: data.coupon_code || '',
        couponInstructions: data.coupon_instructions || '',
        couponTerms: data.coupon_terms || '',
      };
    } catch (e) {
      // JSON parsing failed, fallback to treating standard text
    }
  }

  // Fallback if not JSON: Parse standard caption lines for productName estimation
  const lines = trimmed.split('\n').flatMap(l => {
    const s = l.trim();
    return s ? [s] : [];
  });
  const guessedName = lines[0] || 'Linked Product';
  return {
    ...defaultProduct,
    captionText: trimmed,
    productName: guessedName,
  };
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

export function formatINR(price: number | null | undefined): string {
  if (price === null || price === undefined) return '';
  return inrFormatter.format(price);
}

export function extractStoreName(urlStr: string | null | undefined): string {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    
    // Remove www.
    let cleanHostname = hostname.replace(/^www\./, '');
    
    // If it's a myshopify sub-domain, e.g., mystore.myshopify.com
    if (cleanHostname.endsWith('.myshopify.com')) {
      const shopPrefix = cleanHostname.replace(/\.myshopify\.com$/, '');
      return shopPrefix.charAt(0).toUpperCase() + shopPrefix.slice(1);
    }
    
    const mappings: { [key: string]: string } = {
      'amazon': 'Amazon',
      'amzn': 'Amazon',
      'flipkart': 'Flipkart',
      'myntra': 'Myntra',
      'shopify': 'Shopify',
      'ajio': 'Ajio',
      'meesho': 'Meesho',
      'nykaa': 'Nykaa',
      'tatacliq': 'Tata CLiQ',
      'snapdeal': 'Snapdeal',
      'ebay': 'eBay',
      'etsy': 'Etsy',
      'aliexpress': 'AliExpress',
      'zara': 'Zara',
      'hm': 'H&M',
      'nike': 'Nike',
      'adidas': 'Adidas',
      'puma': 'Puma',
      'macys': 'Macy\'s',
      'walmart': 'Walmart',
      'target': 'Target',
      'bestbuy': 'Best Buy',
      'apple': 'Apple',
      'samsung': 'Samsung'
    };
    
    const parts = cleanHostname.split('.');
    for (const part of parts) {
      if (mappings[part]) {
        return mappings[part];
      }
    }
    
    // Fallback: use first main domain segment capitalized
    const candidate = parts[0];
    if (candidate && candidate !== 'co' && candidate !== 'com' && candidate !== 'org' && candidate !== 'net') {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
    
    return 'Store';
  } catch (e) {
    return 'Store';
  }
}
