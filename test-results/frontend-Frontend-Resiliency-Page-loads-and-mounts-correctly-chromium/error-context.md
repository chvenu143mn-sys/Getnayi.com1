# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend.spec.ts >> Frontend Resiliency >> Page loads and mounts correctly
- Location: tests/frontend.spec.ts:5:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('nav').first()

```

```yaml
- link "Getnayi":
  - /url: /
- link "For You":
  - /url: /
- link "Explore":
  - /url: /explore
- link "Trending":
  - /url: /trending
- link "Messages":
  - /url: /notifications
- link "Profile":
  - /url: /profile
- link "Upload":
  - /url: /upload
- img
- button "button": Trending
- button "button": For You
- link:
  - /url: /explore
- button "button"
- button "button"
- text: "@Venu"
- button "Myntra"
- button "Ltl"
- paragraph: Dreamy Festive Lehenga Look
- button "Show Metadata & Tags"
- button "Product Lehenga ₹569":
  - img "Product"
  - text: Lehenga ₹569
- button "View Coupon (Save ₹500)":
  - img
  - text: View Coupon (Save ₹500)
- img "Venu"
- button "button"
- button "button":
  - img
  - text: "2"
- button "Comment":
  - img
  - text: "2"
- button "button":
  - img
  - text: "0"
- button "button":
  - img
  - text: Share
- button "button": Report
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Frontend Resiliency', () => {
  4  | 
  5  |   test('Page loads and mounts correctly', async ({ page }) => {
  6  |     await page.goto('/');
  7  |     
  8  |     // Check if main feed or onboarding prompts appear
  9  |     // This tells us the components rendered without crashing
  10 |     const appContainer = page.locator('#root');
  11 |     await expect(appContainer).toBeVisible();
  12 |     
  13 |     // Check the bottom navigation or sidebar depending on desktop/mobile
  14 |     // Just looking for something structural
  15 |     const nav = page.locator('nav');
> 16 |     await expect(nav.first()).toBeVisible();
     |                               ^ Error: expect(locator).toBeVisible() failed
  17 |   });
  18 | 
  19 |   test('Error boundary fallback should not be visible normally', async ({ page }) => {
  20 |     await page.goto('/');
  21 |     
  22 |     // Error boundary should not be active
  23 |     const errorMsg = page.getByText('Something went wrong');
  24 |     await expect(errorMsg).toHaveCount(0);
  25 |   });
  26 | });
  27 | 
```