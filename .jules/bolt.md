## 2026-06-21 - Memoizing expensive parsing during video playback
**Learning:** In React, components handling media like `VideoPlayer` re-render frequently (e.g., via `onTimeUpdate` events). Running string extraction or JSON parsing synchronously on every frame (like `extractStoreName` and `parseVideoProduct`) causes significant CPU overhead and can lead to micro-stutters during playback.
**Action:** When a component re-renders rapidly due to state like `currentTime`, immediately look for heavy deterministic functions that can be extracted to `React.useMemo` bound to stable props.
## 2024-06-21 - Resolving N+1 Database Queries in Webhooks
 **Learning:** Sequential database updates inside a `for...of` loop create an N+1 query pattern, severely multiplying network latency (e.g. from 10ms to 500+ms for 50 records).
 **Action:** Refactor sequential iterations involving independent asynchronous I/O (like database updates) to run concurrently using `Promise.all` with `Array.prototype.map`.
