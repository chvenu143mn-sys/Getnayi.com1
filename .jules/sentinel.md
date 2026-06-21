## 2025-02-27 - Server-Side Request Forgery via DNS resolution
**Vulnerability:** Found an SSRF vulnerability where user-supplied URLs were validated using string comparison for blacklisting instead of DNS resolution. The blocklist did not prevent resolving domains like nip.io to internal IPs (e.g. `127.0.0.1.nip.io`).
**Learning:** Checking hostnames strictly as strings is insufficient to block SSRF when attackers can map arbitrary domains to internal IPs.
**Prevention:** Implement `dns.lookup` to check the resolved IP against a blocklist before fetching external resources.
## 2023-10-25 - Timing Attack Vulnerability in Signature Verification
 **Vulnerability:** Cryptographic signatures (e.g., Razorpay webhook, direct-put) were being compared using `===` and `!==` string operators.
 **Learning:** Standard string comparison operators fail fast on the first mismatched character. An attacker can exploit this by measuring the time the server takes to respond, guessing the signature byte-by-byte (a timing attack).
 **Prevention:** Always convert signatures to Buffers of equal length and use `crypto.timingSafeEqual(bufferA, bufferB)` for constant-time comparison when verifying any cryptographic signature, webhook payload, or token.
