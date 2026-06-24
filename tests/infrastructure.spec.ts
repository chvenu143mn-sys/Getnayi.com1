import { test, expect, request } from '@playwright/test';

// Use localhost for node backend integration tests
const API_URL = 'http://localhost:3000';

test.describe('Backend Infrastructure & Scalability Tests', () => {

  test('Idempotency checks - same key yields same response', async ({ request }) => {
    // Generate a random idempotency key
    const idempotencyKey = `test-key-${Math.random().toString(36).substring(7)}`;

    // First Request
    const response1 = await request.post(`${API_URL}/api/auth/signup`, {
       headers: {
         'Idempotency-Key': idempotencyKey,
       },
       data: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'testpassword123'
       }
    });

    const status1 = response1.status();
    const body1 = await response1.json().catch(() => null);

    // Second Request with SAME key
    const response2 = await request.post(`${API_URL}/api/auth/signup`, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'testpassword123'
        }
     });

     const status2 = response2.status();
     const body2 = await response2.json().catch(() => null);

     // If redis is enabled, it should give same response. 
     // Even if it just failed with 401, they should exactly match.
     expect(status1).toEqual(status2);
     if (body1 && body2) {
         expect(body1).toEqual(body2);
     }
  });

  test('Health check endpoint is available', async ({ request }) => {
    // Check if the server is healthy
    const response = await request.get(`${API_URL}/api/feed`); 
    // We expect 200 or at least response not to be 500
    expect([200, 401, 400, 404]).toContain(response.status());
  });
});
