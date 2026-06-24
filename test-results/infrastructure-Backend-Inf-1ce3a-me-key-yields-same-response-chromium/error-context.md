# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: infrastructure.spec.ts >> Backend Infrastructure & Scalability Tests >> Idempotency checks - same key yields same response
- Location: tests/infrastructure.spec.ts:8:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

Expected: 429
Received: 400
```

# Test source

```ts
  1  | import { test, expect, request } from '@playwright/test';
  2  | 
  3  | // Use localhost for node backend integration tests
  4  | const API_URL = 'http://localhost:3000';
  5  | 
  6  | test.describe('Backend Infrastructure & Scalability Tests', () => {
  7  | 
  8  |   test('Idempotency checks - same key yields same response', async ({ request }) => {
  9  |     // Generate a random idempotency key
  10 |     const idempotencyKey = `test-key-${Math.random().toString(36).substring(7)}`;
  11 | 
  12 |     // First Request
  13 |     const response1 = await request.post(`${API_URL}/api/auth/signup`, {
  14 |        headers: {
  15 |          'Idempotency-Key': idempotencyKey,
  16 |        },
  17 |        data: {
  18 |           username: 'testuser',
  19 |           email: 'test@example.com',
  20 |           password: 'testpassword123'
  21 |        }
  22 |     });
  23 | 
  24 |     const status1 = response1.status();
  25 |     const body1 = await response1.json().catch(() => null);
  26 | 
  27 |     // Second Request with SAME key
  28 |     const response2 = await request.post(`${API_URL}/api/auth/signup`, {
  29 |         headers: {
  30 |           'Idempotency-Key': idempotencyKey,
  31 |         },
  32 |         data: {
  33 |           username: 'testuser',
  34 |           email: 'test@example.com',
  35 |           password: 'testpassword123'
  36 |         }
  37 |      });
  38 | 
  39 |      const status2 = response2.status();
  40 |      const body2 = await response2.json().catch(() => null);
  41 | 
  42 |      // If redis is enabled, it should give same response. 
  43 |      // Even if it just failed with 401, they should exactly match.
> 44 |      expect(status1).toEqual(status2);
     |                      ^ Error: expect(received).toEqual(expected) // deep equality
  45 |      if (body1 && body2) {
  46 |          expect(body1).toEqual(body2);
  47 |      }
  48 |   });
  49 | 
  50 |   test('Health check endpoint is available', async ({ request }) => {
  51 |     // Check if the server is healthy
  52 |     const response = await request.get(`${API_URL}/api/feed`); 
  53 |     // We expect 200 or at least response not to be 500
  54 |     expect([200, 401, 400, 404]).toContain(response.status());
  55 |   });
  56 | });
  57 | 
```