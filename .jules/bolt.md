## 2026-06-21 - Memoizing expensive parsing during video playback
**Learning:** In React, components handling media like `VideoPlayer` re-render frequently (e.g., via `onTimeUpdate` events). Running string extraction or JSON parsing synchronously on every frame (like `extractStoreName` and `parseVideoProduct`) causes significant CPU overhead and can lead to micro-stutters during playback.
**Action:** When a component re-renders rapidly due to state like `currentTime`, immediately look for heavy deterministic functions that can be extracted to `React.useMemo` bound to stable props.
 perf/parallelize-bunnycdn-cron-4378147584517776382

## 2024-05-30 - Parallelize Sequential Async Work in Loops
 **Learning:** I/O operations (like `fetch` or DB updates) inside a `for...of` loop are unnecessarily sequential and blocking, multiplying network latency per item.
 **Action:** Refactor sequential `for...of` loops involving independent async tasks to concurrent operations using `await Promise.all(array.map(async (item) => ...))`. Ensure `try-catch` blocks stay *inside* the mapped function so one failure doesn't reject the entire batch, and ensure flow control changes (like `continue` -> `return`).

## 2024-06-21 - Parallelize External API Requests in Loops
 **Learning:** Using `await` inside a `for...of` loop sequentially blocks the execution thread when making network requests to external APIs (like Stripe). Using `Promise.all` allows executing these requests concurrently, significantly reducing overall latency (e.g., from ~2500ms to ~50ms for 50 users).
 **Action:** When iterating over a list to perform I/O bound operations, use `await Promise.all(list.map(async item => {...}))`. If the list is potentially large, process it in chunks (e.g., slice into batches of 10) or use a concurrency limiter to prevent hitting rate limits on the external API.
 main
