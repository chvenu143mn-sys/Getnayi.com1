 fix-timing-attack-hmac-verification-17273739814439264621
## 2025-02-27 - Server-Side Request Forgery via DNS resolution
**Vulnerability:** Found an SSRF vulnerability where user-supplied URLs were validated using string comparison for blacklisting instead of DNS resolution. The blocklist did not prevent resolving domains like nip.io to internal IPs (e.g. `127.0.0.1.nip.io`).
**Learning:** Checking hostnames strictly as strings is insufficient to block SSRF when attackers can map arbitrary domains to internal IPs.
**Prevention:** Implement `dns.lookup` to check the resolved IP against a blocklist before fetching external resources.
 jules-13027050145507429317-e68e2786

## 2026-06-21 - SSRF and DNS Rebinding Prevention in Outbound Requests
 **Vulnerability:** SSRF bypass allowing fetch to follow redirects to internal IPs or bypassing hostname checks via alternative IP formats (octal/decimal) and DNS Rebinding (TOCTOU).
 **Learning:** Standard `fetch()` blindly follows redirects and connects based on the hostname. Checking a URL prior to calling fetch is insufficient because the server can respond with a redirect to a malicious target (e.g. `169.254.169.254`), or the DNS mapping could change between the initial check and the actual fetch execution.
 **Prevention:** Implement a custom request function using `http(s).request` that manually follows redirects up to a maximum limit, explicitly validates the URL at each hop using `dns.promises.lookup`, and overrides the `lookup` option to bind the connection directly to the pre-verified IP address.

 fix-timing-attack-6282051958295197058
## 2023-10-25 - Timing Attack Vulnerability in Signature Verification
 **Vulnerability:** Cryptographic signatures (e.g., Razorpay webhook, direct-put) were being compared using `===` and `!==` string operators.
 **Learning:** Standard string comparison operators fail fast on the first mismatched character. An attacker can exploit this by measuring the time the server takes to respond, guessing the signature byte-by-byte (a timing attack).
 **Prevention:** Always convert signatures to Buffers of equal length and use `crypto.timingSafeEqual(bufferA, bufferB)` for constant-time comparison when verifying any cryptographic signature, webhook payload, or token.

## 2024-05-24 - Timing Attack Vulnerability in HMAC Signature Verification
 **Vulnerability:** Timing Attack Vulnerability in HMAC Signature Verification where signature comparison was done using strict equality (`===` or `!==`). This allows attackers to guess the signature byte-by-byte by measuring the time taken for the comparison to fail.
 **Learning:** Using standard string comparison operators (`===` or `!==`) on cryptographic signatures exits early upon the first mismatching character, leaking timing information that can be exploited to bypass authentication checks.
 **Prevention:** Always use `crypto.timingSafeEqual(a, b)` for comparing sensitive cryptographic material, such as passwords, tokens, and HMAC signatures. Ensure both inputs are buffers of the exact same length before calling `timingSafeEqual` to avoid throwing errors.

## 2023-10-24 - Dynamic PostgREST .or() Syntax Injection
 **Vulnerability:** An SQL/syntax injection vulnerability existed where user inputs (`cleanQuery`, `userInterests`) were directly interpolated into PostgREST `.or()` filter strings in Supabase without escaping.
 **Learning:** Because `queryBuilder.or()` takes a comma-separated string that parses commas and quotes to define filtering conditions, unescaped commas allow attackers to break out of the intended condition and inject arbitrary clauses.
 **Prevention:** Whenever using string interpolation inside PostgREST filter builders like `.or()`, wrap dynamic user values in double quotes and escape internal double quotes by doubling them (`""`).
 main
 main
 main
