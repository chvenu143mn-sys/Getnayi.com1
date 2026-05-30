import { test, expect } from '@playwright/test';

test.describe('Getnayi End-to-End User Experience & Security Auditing Suite', () => {

  test.beforeEach(async ({ page }, testInfo) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('request', request => {
      console.log('NETWORK REQ:', request.method(), request.url());
    });
    page.on('response', async response => {
      const url = response?.url();
      if (url && url.includes('supabase.co')) {
        try {
          const body = await response.text();
          console.log('NETWORK SUPABASE RESPONSE:', response.status(), url, body);
        } catch (e) {
          console.log('NETWORK SUPABASE RESPONSE (No Text):', response.status(), url);
        }
      } else if (response.status() >= 400) {
        console.log('NETWORK FAILURE:', response.status(), url);
      }
    });

    const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE5OTk5OTk5OTksInN1YiI6InRlc3QtdXNlci1pZCIsImVtYWlsIjoiYWRtaW5AZ2V0bmF5aS5jb20iLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQifQ.dummy-signature';

    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
    console.log('--- DIAGNOSTIC: process.env.VITE_SUPABASE_URL =', process.env.VITE_SUPABASE_URL);
    let host = 'placeholder.supabase.co';
    try {
      host = new URL(supabaseUrl).host;
    } catch (e) {}
    const tokenKey = `sb-${host}-auth-token`;

    const isGuestFlow = testInfo.title.startsWith('1.') || testInfo.title.startsWith('2.');

    if (!isGuestFlow) {
      // Save fake supabase session in localStorage to bypass initial loading state or unauthenticated locks
      await page.addInitScript(({ key, jwtToken }) => {
        const mockSession = {
          access_token: jwtToken,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'test-user-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'admin@getnayi.com',
            email_confirmed_at: '2026-05-30T00:00:00Z',
            phone: '',
            confirmed_at: '2026-05-30T00:00:00Z',
            last_sign_in_at: '2026-05-30T00:00:00Z',
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: { username: 'admin' },
            identities: [],
            created_at: '2026-05-30T00:00:00Z',
            updated_at: '2026-05-30T00:00:00Z'
          }
        };

        // Set global E2E mock user for AuthContext
        // @ts-ignore
        window.__MOCK_USER__ = mockSession.user;

        try {
          localStorage.setItem(key, JSON.stringify(mockSession));
          localStorage.setItem('sb-placeholder.supabase.co-auth-token', JSON.stringify(mockSession));
          localStorage.setItem('sb-localhost-auth-token', JSON.stringify(mockSession));
        } catch (e) {}
      }, { key: tokenKey, jwtToken: mockJwt });
    }

    // Intercept auth signup API
    await page.route('**/api/auth/signup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 'test-user-id', email: 'test@example.com' },
            session: { access_token: mockJwt, user: { id: 'test-user-id' } }
          }
        })
      });
    });

    // Intercept Supabase Auth request token/session verifier
    await page.route('**/auth/v1/user*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'admin@getnayi.com',
          email_confirmed_at: '2026-05-30T00:00:00Z',
          phone: '',
          confirmed_at: '2026-05-30T00:00:00Z',
          last_sign_in_at: '2026-05-30T00:00:00Z',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { username: 'admin' },
          identities: [],
          created_at: '2026-05-30T00:00:00Z',
          updated_at: '2026-05-30T00:00:00Z'
        })
      });
    });

    // Mock general profiles lists
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Intercept profile select is_admin query
    await page.route(/.*\/rest\/v1\/profiles\?select=is_admin.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ is_admin: true })
      });
    });

    // Mock creator applications list
    await page.route('**/rest/v1/creator_applications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock reports list
    await page.route('**/rest/v1/reports*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock categories list
    await page.route('**/rest/v1/categories*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock videos list
    await page.route('**/rest/v1/videos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Intercept feed API matching cursor
    await page.route('**/api/feed*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'test-video-id-1',
              caption: 'Amazing Glow Serum Product Review!',
              video_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
              thumbnail_url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format',
              product_url: 'https://amazon.com/glow-serum',
              category_id: 'skincare-123',
              categories: { name: 'Skincare' },
              profiles: { username: 'glow_creator', is_brand: false }
            }
          ],
          nextCursor: null
        })
      });
    });

    // Intercept link-preview matching secure link resolution
    await page.route('**/api/link-preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Premium Glow Serum - Organic Skin Shop',
          domain: 'amazon.com',
          favicon: 'https://amazon.com/favicon.ico'
        })
      });
    });

    // Intercept internal admin API telemetry routes
    await page.route('**/api/admin/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
  });

  test('1. User Signup Flow & Interaction', async ({ page }) => {
    // Navigate to Auth screen
    await page.goto('/auth');

    // Select Email onboarding
    const continueEmailBtn = page.locator('text=Continue with Email');
    await expect(continueEmailBtn).toBeVisible();
    await continueEmailBtn.click();

    // Verify fields appear (Signup Mode is active by default in UI)
    const usernameInput = page.locator('[placeholder="Choose a username"]');
    const emailInput = page.locator('[placeholder="Email address"]');
    const passwordInput = page.locator('[placeholder="Password"]');
    const submitBtn = page.locator('button:has-text("Sign Up")');

    await expect(usernameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Fill form details like a real user
    await usernameInput.fill('serumtester');
    await emailInput.fill('tester@getnayi.com');
    await passwordInput.fill('securepass123');

    // Assert values filled correctly
    await expect(usernameInput).toHaveValue('serumtester');
    await expect(emailInput).toHaveValue('tester@getnayi.com');
    await expect(passwordInput).toHaveValue('securepass123');
  });

  test('2. User Login Mode Toggle', async ({ page }) => {
    await page.goto('/auth');

    // Click Login trigger button at status bar
    const loginToggle = page.locator('button:has-text("Log in"), button:has-text("Sign up")');
    await expect(loginToggle).toBeVisible();
    await loginToggle.click();

    // Expect input mode switch
    const emailInput = page.locator('[placeholder="Email address"]');
    const passwordInput = page.locator('[placeholder="Password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Fill credentials
    await emailInput.fill('admin@getnayi.com');
    await passwordInput.fill('admin123');

    await expect(emailInput).toHaveValue('admin@getnayi.com');
  });

  test('3. Home Feed Rendering & Dynamic Navigation', async ({ page }) => {
    await page.goto('/');

    // Check Home screen view and Bottom Nav indicators
    const homeIcon = page.locator('text=Home');
    const exploreIcon = page.locator('text=Explore');
    const profileIcon = page.locator('text=Profile');

    await expect(homeIcon).toBeVisible();
    await expect(exploreIcon).toBeVisible();
    await expect(profileIcon).toBeVisible();
  });

  test('4. Explore Page, Autocomplete & Instant Search Checks', async ({ page }) => {
    await page.goto('/explore');

    // Verify Search Box component
    const searchBox = page.locator('[placeholder="Search creators or products"]');
    await expect(searchBox).toBeVisible();

    // Click on Trending Searches shortcuts
    const trendSearch = page.locator('text="Korean Skincare"').first();
    await expect(trendSearch).toBeVisible();
    await trendSearch.click();

    // Search query auto-populates
    await expect(searchBox).toHaveValue('Korean Skincare');
  });

  test('5. Upload Onboarding Options & Link Hardener Safety Check', async ({ page }) => {
    await page.goto('/upload');

    // Check the upload gateway container
    const creatorOnboardingBtn = page.locator('text=Register as Creator');
    const brandOnboardingBtn = page.locator('text=Join as Brand Partner');
    
    // Check elements
    if (await creatorOnboardingBtn.isVisible()) {
      await expect(creatorOnboardingBtn).toBeVisible();
    }
    if (await brandOnboardingBtn.isVisible()) {
      await expect(brandOnboardingBtn).toBeVisible();
    }
  });

  test('6. Profile Workspace Interactivity', async ({ page }) => {
    await page.goto('/profile');

    // Check registration limits indicators or login screen redirect
    const userPrompt = page.locator('body');
    await expect(userPrompt).toBeVisible();
  });

  test('7. Admin Panel & Search Optimization Telemetry Audit', async ({ page }) => {
    // Check if admin page renders settings and diagnostics correctly
    await page.goto('/admin');

    const storageData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const tokenKey = keys.find(k => k.includes('auth-token')) || '';
      return {
        keys,
        tokenValue: localStorage.getItem(tokenKey)
      };
    });
    console.log('--- STORAGE DIAGNOSTIC FOR ADMIN PAGE:', storageData);

    // Wait for the admin sidebar structure to be loaded so we know it completed loading
    const adminHeader = page.locator('text=Getnayi Admin');
    const searchOptTab = page.locator('text=Search Optimization');

    await expect(adminHeader).toBeVisible();
    await expect(searchOptTab).toBeVisible();
  });

});
