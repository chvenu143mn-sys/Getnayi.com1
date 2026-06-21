## 2026-06-21 - Memoizing expensive parsing during video playback
**Learning:** In React, components handling media like `VideoPlayer` re-render frequently (e.g., via `onTimeUpdate` events). Running string extraction or JSON parsing synchronously on every frame (like `extractStoreName` and `parseVideoProduct`) causes significant CPU overhead and can lead to micro-stutters during playback.
**Action:** When a component re-renders rapidly due to state like `currentTime`, immediately look for heavy deterministic functions that can be extracted to `React.useMemo` bound to stable props.
