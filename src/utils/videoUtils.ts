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
