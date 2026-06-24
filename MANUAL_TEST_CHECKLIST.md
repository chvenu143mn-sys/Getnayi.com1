# Manual Test Checklist

This checklist covers scenarios that are difficult to fully automate or require human verification to ensure optimal user experience and security.

## 1. Core User Flows
- [ ] **Sign Up / Login**
  - Verify email/password login works.
  - Verify OAuth (Google) login works and redirects correctly.
  - Test login with invalid credentials shows an appropriate error.
- [ ] **Video Upload**
  - Upload a video under 50MB. Verify progress bar.
  - Upload a video > 50MB. Verify size limit error is shown.
  - Test video extraction of products/stores (metadata parsing).
- [ ] **Video Feed (Scroll & Autoplay)**
  - Scroll through the feed; ensure only the active video plays.
  - Verify out-of-view videos are paused.
  - Verify sound toggle persists across scroll.

## 2. Fallbacks and Error Handling
- [ ] **Offline Mode**
  - Disconnect internet and attempt to load the app. Verify PWA offline fallback or graceful degradation.
- [ ] **Error Boundary Simulation**
  - Manually trigger a component error (e.g., in React DevTools) and verify the `ErrorBoundary` catches it and displays the fallback UI rather than a blank white screen.
- [ ] **Rate Limiting (API)**
  - Spam click the "Like" button rapidly. Verify that subsequent requests are debounced or that the server returns a 429 Too Many Requests status handled gracefully without crashing the app.

## 3. Engagement & Interactivity
- [ ] **Like / Save / Share**
  - Verify the Like button toggles instantly (optimistic UI).
  - Verify Save to Collection functionality.
  - Verify the Share link copies to clipboard.
- [ ] **Commenting**
  - Add a comment, see it appear instantly.
  - Delete a comment (if author) and verify it's removed.

## 4. Admin & Creator Tools
- [ ] **Creator Dashboard**
  - Check Analytics loading.
  - Verify 'Trending Score' calculation is reflected accurately.
- [ ] **Admin Moderation**
  - Test 'approve' and 'reject' operations on pending videos.
  - Verify deleted/rejected videos are removed from the main Feed.
  - Check Audit Logs for recorded admin actions.

## 5. Security & Infrastructure (Manual Verifications)
- [ ] **Idempotency**
  - Submit the same POST request (e.g., signup or like) with the identical `Idempotency-Key` header twice via Postman. Ensure the second request returns the cached response and doesn't trigger duplicate database entries.
- [ ] **Direct API Access (Auth Bypass)**
  - Attempt to call an authenticated API route (e.g., `/api/admin/videos` or `/api/engagement/like`) without an Auth token. Verify it returns `401 Unauthorized`.
- [ ] **Circuit Breaker**
  - (Simulated) Block the Gemini API temporarily, or simulate 503s. Verify the Circuit Breaker opens and subsequent requests fail fast without waiting for timeouts.

## 6. Performance
- [ ] **Lighthouse Audit**
  - Run Google Chrome Lighthouse in incognito. Verify Performance, Accessibility, and SEO scores are >= 90.
- [ ] **Infinite Scroll Network Cost**
  - Monitor the Network tab while scrolling down 20+ videos. Ensure pagination is working and memory doesn't continuously balloon.

## 7. Database & Caching
- [ ] **Materialized Views Refresh**
  - Verify that `refresh_mv_trending_videos()` periodically executes and that new trends load correctly.
- [ ] **Dead Letter Queue (DLQ)**
  - Inspect Redis for the `video_views_dlq` key to see if any sync failures were properly logged instead of silently disappearing.
