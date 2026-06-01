# Getnayi Platform Architecture

## Executive Summary
Getnayi is a creator-driven social commerce platform. The architecture optimizes for product discovery, creator trust, and authentic engagement. It moves away from purely engagement-driven, time-wasting loops towards **intent-driven commerce** and **high-trust creator relationships**.

This document outlines the architectural blueprint for Getnayi's back-end systems, recommendation engine, search, and security posture.

---

## 1. Interest & Recommendation System (The "Commerce Intent" Engine)

Traditional social media platforms use "Interest Scores" designed to maximize watch time. Getnayi needs an **"Intent Score"** designed to maximize purchase confidence and product utility.

### 1.1 Dynamic Interest Scoring
*   **Hierarchical Entity Graph:** Instead of flat categories (e.g., "Technology"), use a taxonomy graph (e.g., `Technology` -> `Audio` -> `Wireless Earbuds`).
*   **High-Intent Behavioral Weighting:**
    *   *Low Signal (1x):* Views, short watch time.
    *   *Medium Signal (3x):* Video completion, Likes, Profile Visits.
    *   *High Signal (10x):* Saves/Bookmarks, Product Clicks, adding to cart, successful affiliate conversions.
*   **Contextual Decay:** Interest shouldn't decay uniformly. A user looking for "Laptops" loses interest rapidly after a product click (they bought it). A user looking for "Fashion" has a persistent, slow-decaying interest.
*   *Implementation:* Store raw engagement counters in PostgreSQL, and calculate scores asynchronously via background workers (to keep the API fast).

### 1.2 Feed Architecture
*   **For You (Discovery):** A blended algorithmic feed:
    *   `60%`: Intent-matched items (Vector semantic search against recent watch history).
    *   `30%`: Creator-Authority items (highly trusted creators in the user's broad interest buckets).
    *   `10%`: Exploration/Diversity injection (to prevent filter bubbles).
*   **Following (Trust):** High-fidelity feed. Users rely on this for verified purchases. Strongly chronological.
*   **Scoring Formula (Reddit/HN style modified for commerce):**
    `Score = (Engagement_Weight * Trust_Multiplier) / (Age_In_Hours + 2)^Gravity`

---

## 2. Search & Discovery Engine

Commerce search is highly specific. Users search for solutions, not just keywords ("best gym headphones under $100").

### 2.1 Technology Stack
*   **Primary Database:** PostgreSQL with `pg_trgm` (for typos and fast partial matching).
*   **Semantic Layer:** `pgvector`. Generate embeddings for video descriptions, product titles, and AI-transcribed video audio (using Gemini).
*   **Hybrid Search:** Combine sparse (TF-IDF/BM25 text matching) and dense (Vector embeddings) retrieval to surface highly relevant products even if the exact keyword isn't mentioned by the creator.

### 2.2 Creator & Product Discovery
*   **Creator Trust Authority (CTA):** Rank creators in search based on their historical product click-through rates (CTR) and save ratios. A creator with millions of fake views but no product clicks gets downranked.

---

## 3. Trust & Anti-Abuse System

Fake reviews, engagement farming, and spam link manipulation will destroy a social commerce platform.

### 3.1 Creator Trust Score (Internal)
*   **Positive Signals:** Consistent upload frequency, high user-save rates, diverse audience engagement, low bounce rates on product links.
*   **Negative Penalties:** Rapid-fire uploading of duplicate content, keyword stuffing descriptions, abnormally high clustering of likes from a single IP subnet (bot rings).

### 3.2 Anti-Manipulation Vectors
*   **Rate Limiting:** Redis-based token bucket algorithms for APIs (e.g., max 10 likes per minute per user).
*   **Engagement Normalization:** Weight engagements inversely to user velocity. A user who likes 1,000 videos a day has their "Like" valued at `0.01`. A user who likes 3 videos a week has their "Like" valued at `1.0`.
*   **View Validation:** Views only register in the DB if the video is at least 30% visible in the viewport and played for > 3 seconds (tracked client-side and verified via signed telemetry tokens).

---

## 4. Scalability Design

*   **Database:** Supabase (PostgreSQL) optimized with connection pooling (PgBouncer) for high-concurrency read/write.
*   **Caching Layer:** Upstash/Redis for:
    *   Feed pre-computation (trending feeds calculated every hour and cached).
    *   Session states, rate limits.
*   **Media Delivery:** BunnyCDN / Bunny Stream. Offloads heavy video bandwidth, provides global edge caching, and automatically transcodes HLS streams for adaptive bitrates (preventing infinite buffering on mobile).
*   **Asynchronous Processing:** Move heavy lifting (embedding generation, feed score recalculation, video processing) to background worker queues, keeping the main Express server unblocked.

---

## 5. Security Architecture

*   **Zero Trust APIs:** All routes must pass through a strict `verifyAuth` middleware.
*   **Row Level Security (RLS):** Supabase RLS policies are the last line of defense. Even if the API is bypassed, the database blocks unauthorized modifications.
*   **Secure Product Links:** All external product links are routed through a Getnayi redirector (`/out?url=...`) to:
    *   Sanitize the URL (prevent XSS/malicious redirects).
    *   Track outgoing commerce intent clicks privately.
    *   Append affiliate tags securely on the server-side, preventing client-side scraping.
*   **Data PII:** User emails and sensitive identity points are handled strictly by Supabase Auth, securely isolated from the public `profiles` table.
