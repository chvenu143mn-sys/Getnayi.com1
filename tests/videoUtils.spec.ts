import { test, expect } from '@playwright/test';
 test-desktop-friendly-url-17631885971502792739
import { getDesktopFriendlyUrl } from '../src/utils/videoUtils';

test.describe('getDesktopFriendlyUrl', () => {
  test('returns empty string for falsy input', () => {
    expect(getDesktopFriendlyUrl('')).toBe('');
    expect(getDesktopFriendlyUrl(null)).toBe('');
    expect(getDesktopFriendlyUrl(undefined)).toBe('');
  });

  test('parses Android Intent URLs correctly', () => {
    expect(getDesktopFriendlyUrl('intent://example.com#Intent;scheme=https;end')).toBe('https://example.com');
    expect(getDesktopFriendlyUrl('intent://example.com/path#Intent;scheme=http;end')).toBe('http://example.com/path');
  });

  test('parses custom App Schemes correctly', () => {
    expect(getDesktopFriendlyUrl('meesho://product/123')).toBe('https://www.meesho.com/product/123');
    expect(getDesktopFriendlyUrl('flipkart://item/abc')).toBe('https://www.flipkart.com/item/abc');
    expect(getDesktopFriendlyUrl('amazon://dp/B08N5WRWNW')).toBe('https://www.amazon.in/dp/B08N5WRWNW');
    expect(getDesktopFriendlyUrl('amzn://dp/B08N5WRWNW')).toBe('https://www.amazon.in/dp/B08N5WRWNW');
    expect(getDesktopFriendlyUrl('myntra://shoe/456')).toBe('https://www.myntra.com/shoe/456');
    expect(getDesktopFriendlyUrl('ajio://shirt/789')).toBe('https://www.ajio.com/shirt/789');
  });

  test('handles Play Store redirection URLs correctly', () => {
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&url=https://example.com/product')).toBe('https://example.com/product');
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&fallback_url=https://fallback.com/product')).toBe('https://fallback.com/product');
  });

  test('returns original string if it is a regular URL', () => {
    expect(getDesktopFriendlyUrl('https://www.example.com/product')).toBe('https://www.example.com/product');
  });

  test('catches error and returns original string', () => {
    // This will trigger an error inside `new URL(urlStr)`
    const invalidUrl = 'play.google.com/store?url=test';
    expect(getDesktopFriendlyUrl(invalidUrl)).toBe(invalidUrl);
  });
});

import { extractStoreName, parseVideoProduct } from '../src/utils/videoUtils';

test.describe('extractStoreName', () => {
  test('should return empty string for null or undefined', () => {
    expect(extractStoreName(null)).toBe('');
    expect(extractStoreName(undefined)).toBe('');
    expect(extractStoreName('')).toBe('');
  });

  test('should extract known store names from URL', () => {
    expect(extractStoreName('https://www.amazon.com/product')).toBe('Amazon');
    expect(extractStoreName('https://myntra.com/dress')).toBe('Myntra');
    expect(extractStoreName('https://www.shopify.com/store')).toBe('Shopify');
    expect(extractStoreName('https://flipkart.com/item')).toBe('Flipkart');
  });

  test('should handle myshopify subdomains', () => {
    expect(extractStoreName('https://mystore.myshopify.com/product')).toBe('Mystore');
  });

  test('should return Store for unknown generic domains', () => {
    // Falls back to capitalization of first part
    expect(extractStoreName('https://unknownstore.com')).toBe('Unknownstore');
  });

  test('should fallback to Store for invalid URLs', () => {
    // This triggers the try-catch block
    expect(extractStoreName('invalid-url-string')).toBe('Store');
    expect(extractStoreName('htp://')).toBe('Store');
  });
});
 testing-parse-video-product-6764139141148712902

test.describe('parseVideoProduct', () => {
  test('should fallback to treating as standard text when parsing invalid JSON', () => {
    const invalidJson = "{ invalid json }";
    const result = parseVideoProduct(invalidJson);

    expect(result.captionText).toBe(invalidJson);
    expect(result.productName).toBe(invalidJson);
  });
});

 test-get-desktop-friendly-url-10707062041127835585

test.describe('getDesktopFriendlyUrl', () => {
  test('should return empty string for falsy inputs', () => {
    expect(getDesktopFriendlyUrl(null)).toBe('');
    expect(getDesktopFriendlyUrl(undefined)).toBe('');
    expect(getDesktopFriendlyUrl('')).toBe('');
  });

  test('should return standard HTTP/HTTPS URLs as is', () => {
    expect(getDesktopFriendlyUrl('https://www.example.com/path')).toBe('https://www.example.com/path');
    expect(getDesktopFriendlyUrl('http://example.com')).toBe('http://example.com');
  });

  test('should handle Android intent URLs correctly', () => {
    expect(getDesktopFriendlyUrl('intent://www.example.com/path#Intent;scheme=http;package=com.example;end')).toBe('http://www.example.com/path');
    // Fallback to https if no scheme is provided
    expect(getDesktopFriendlyUrl('intent://example.com#Intent;package=com.example;end')).toBe('https://example.com');
  });

  test('should handle known app schemes', () => {
    expect(getDesktopFriendlyUrl('meesho://product/123')).toBe('https://www.meesho.com/product/123');
    expect(getDesktopFriendlyUrl('flipkart://item?id=456')).toBe('https://www.flipkart.com/item?id=456');
    expect(getDesktopFriendlyUrl('amazon://dp/B08N5WRWNW')).toBe('https://www.amazon.in/dp/B08N5WRWNW');
    expect(getDesktopFriendlyUrl('amzn://dp/B08N5WRWNW')).toBe('https://www.amazon.in/dp/B08N5WRWNW');
    expect(getDesktopFriendlyUrl('myntra://product/789')).toBe('https://www.myntra.com/product/789');
    expect(getDesktopFriendlyUrl('ajio://item/000')).toBe('https://www.ajio.com/item/000');
  });

  test('should return original URL for unknown app schemes', () => {
    expect(getDesktopFriendlyUrl('unknown://app/data')).toBe('unknown://app/data');
    expect(getDesktopFriendlyUrl('somethingelse://path')).toBe('somethingelse://path');
  });

  test('should extract URLs from Play Store redirection URLs', () => {
    // Has both, but url comes first in priority if it starts with http
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&url=https://embedded.url.com')).toBe('https://embedded.url.com');
    // Fallback URL
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&fallback_url=https://fallback.url.com')).toBe('https://fallback.url.com');
    // Doesn't start with http
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&url=custom://scheme')).toBe('https://play.google.com/store/apps/details?id=com.example&url=custom://scheme');
  });

  test('should handle invalid URL inputs triggering the catch block', () => {
    // A string that fails `new URL(urlStr)` inside the Play Store logic
    expect(getDesktopFriendlyUrl('play.google.com/store?url=something_invalid')).toBe('play.google.com/store?url=something_invalid');
  });
});

 testing-videoutils-parsevideoproduct-4977186561800272510

test.describe('videoUtils - parseVideoProduct', () => {
  const defaultProduct: ParsedProduct = {
    captionText: '',
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
    couponDiscountValue: '',
    couponDiscountType: 'percentage',
    couponInstructions: '',
    couponTerms: '',
  };

  test('should return default product for null, undefined, or empty string', () => {
    expect(parseVideoProduct(null)).toEqual(defaultProduct);
    expect(parseVideoProduct(undefined)).toEqual(defaultProduct);
    expect(parseVideoProduct('')).toEqual(defaultProduct);
  });

  test('should parse valid JSON with all fields', () => {
    const validJson = JSON.stringify({
      captionText: 'Awesome JSON Product!',
      product_name: 'Super Serum',
      product_price: '499.99',
      product_uses: ['Skin care', 'Daily use'],
      key_specifications: ['50ml', 'Organic'],
      benefits: ['Glows skin', 'Reduces aging'],
      why_recommends: 'Highly effective',
      best_for: 'All skin types',
      what_liked: 'Smells nice',
      things_know: 'Apply gently',
      coupon_code: 'SAVE10',
      coupon_discount_value: '10',
      coupon_discount_type: 'percentage',
      coupon_instructions: 'Use at checkout',
      coupon_terms: 'Valid till year end'
    });

    const expected: ParsedProduct = {
      captionText: 'Awesome JSON Product!',
      productName: 'Super Serum',
      productPrice: 499.99,
      productUses: ['Skin care', 'Daily use'],
      keySpecifications: ['50ml', 'Organic'],
      benefits: ['Glows skin', 'Reduces aging'],
      whyRecommends: 'Highly effective',
      bestFor: 'All skin types',
      whatILiked: 'Smells nice',
      thingsToKnow: 'Apply gently',
      couponCode: 'SAVE10',
      couponDiscountValue: '10',
      couponDiscountType: 'percentage',
      couponInstructions: 'Use at checkout',
      couponTerms: 'Valid till year end'
    };

    expect(parseVideoProduct(validJson)).toEqual(expected);
  });

  test('should parse valid JSON with partial fields and handle lists correctly', () => {
    const partialJson = JSON.stringify({
      product_name: 'Basic Cream',
      product_uses: '• Moisturizer\n• Protector',
      product_price: null
    });

    const result = parseVideoProduct(partialJson);

    expect(result.productName).toBe('Basic Cream');
    expect(result.productUses).toEqual(['Moisturizer', 'Protector']);
    expect(result.productPrice).toBeNull();
    // Default fallback values for others
    expect(result.benefits).toEqual([]);
    expect(result.couponDiscountType).toBe('percentage');
  });

  test('should fallback to standard text parsing if JSON parsing fails', () => {
    const malformedJson = '{ product_name: "Unquoted Keys" }'; // Invalid JSON

    const expected = {
      ...defaultProduct,
      captionText: malformedJson,
      productName: malformedJson // The first line
    };

    expect(parseVideoProduct(malformedJson)).toEqual(expected);
  });

  test('should parse standard text by using first line as product name', () => {
    const standardText = `Amazing Shampoo
    Really great for hair

    Buy now!`;

    const expected = {
      ...defaultProduct,
      captionText: standardText.trim(),
      productName: 'Amazing Shampoo'
    };

    expect(parseVideoProduct(standardText)).toEqual(expected);
  });

  test('should ignore empty lines when parsing standard text', () => {
    const standardText = `

      First Line Content
    Second Line Content
    `;

    const result = parseVideoProduct(standardText);
    expect(result.captionText).toBe(standardText.trim());
    expect(result.productName).toBe('First Line Content');
  });
});

 main
 main
 main
 main
