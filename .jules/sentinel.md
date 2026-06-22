 fix-timing-attack-hmac-verification-17273739814439264621
## 2025-02-27 - Server-Side Request Forgery via DNS resolution
**Vulnerability:** Found an SSRF vulnerability where user-supplied URLs were validated using string comparison for blacklisting instead of DNS resolution. The blocklist did not prevent resolving domains like nip.io to internal IPs (e.g. `127.0.0.1.nip.io`).
**Learning:** Checking hostnames strictly as strings is insufficient to block SSRF when attackers can map arbitrary domains to internal IPs.
**Prevention:** Implement `dns.lookup` to check the resolved IP against a blocklist before fetching external resources.
## 2024-05-24 - Timing Attack Vulnerability in HMAC Signature Verification
 **Vulnerability:** Timing Attack Vulnerability in HMAC Signature Verification where signature comparison was done using strict equality (`===` or `!==`). This allows attackers to guess the signature byte-by-byte by measuring the time taken for the comparison to fail.
 **Learning:** Using standard string comparison operators (`===` or `!==`) on cryptographic signatures exits early upon the first mismatching character, leaking timing information that can be exploited to bypass authentication checks.
 **Prevention:** Always use `crypto.timingSafeEqual(a, b)` for comparing sensitive cryptographic material, such as passwords, tokens, and HMAC signatures. Ensure both inputs are buffers of the exact same length before calling `timingSafeEqual` to avoid throwing errors.

## 2023-10-24 - Dynamic PostgREST .or() Syntax Injection
 **Vulnerability:** An SQL/syntax injection vulnerability existed where user inputs (`cleanQuery`, `userInterests`) were directly interpolated into PostgREST `.or()` filter strings in Supabase without escaping.
 **Learning:** Because `queryBuilder.or()` takes a comma-separated string that parses commas and quotes to define filtering conditions, unescaped commas allow attackers to break out of the intended condition and inject arbitrary clauses.
 **Prevention:** Whenever using string interpolation inside PostgREST filter builders like `.or()`, wrap dynamic user values in double quotes and escape internal double quotes by doubling them (`""`).
 main
