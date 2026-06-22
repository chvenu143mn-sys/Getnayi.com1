import { test, expect } from '@playwright/test';
 testing-videoutils-parsevideoproduct-4977186561800272510
import { extractStoreName, parseVideoProduct, ParsedProduct } from '../src/utils/videoUtils';

import { extractStoreName } from '../src/utils/videoUtils';
 main

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
