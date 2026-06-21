## 2025-02-27 - Server-Side Request Forgery via DNS resolution
**Vulnerability:** Found an SSRF vulnerability where user-supplied URLs were validated using string comparison for blacklisting instead of DNS resolution. The blocklist did not prevent resolving domains like nip.io to internal IPs (e.g. `127.0.0.1.nip.io`).
**Learning:** Checking hostnames strictly as strings is insufficient to block SSRF when attackers can map arbitrary domains to internal IPs.
**Prevention:** Implement `dns.lookup` to check the resolved IP against a blocklist before fetching external resources.
## 2024-05-24 - Timing Attack Vulnerability in HMAC Signature Verification
 **Vulnerability:** Timing Attack Vulnerability in HMAC Signature Verification where signature comparison was done using strict equality (`===` or `!==`). This allows attackers to guess the signature byte-by-byte by measuring the time taken for the comparison to fail.
 **Learning:** Using standard string comparison operators (`===` or `!==`) on cryptographic signatures exits early upon the first mismatching character, leaking timing information that can be exploited to bypass authentication checks.
 **Prevention:** Always use `crypto.timingSafeEqual(a, b)` for comparing sensitive cryptographic material, such as passwords, tokens, and HMAC signatures. Ensure both inputs are buffers of the exact same length before calling `timingSafeEqual` to avoid throwing errors.
