import { test, expect } from '@playwright/test';

test.describe('Frontend Resiliency', () => {

  test('Page loads and mounts correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check if main feed or onboarding prompts appear
    // This tells us the components rendered without crashing
    const appContainer = page.locator('#root');
    await expect(appContainer).toBeVisible();
    
    // Check the main application container structure
    const childDiv = page.locator('#root > div');
    await expect(childDiv.first()).toBeVisible();
  });

  test('Error boundary fallback should not be visible normally', async ({ page }) => {
    await page.goto('/');
    
    // Error boundary should not be active
    const errorMsg = page.getByText('Something went wrong');
    await expect(errorMsg).toHaveCount(0);
  });
});
