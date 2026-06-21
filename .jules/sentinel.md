## 2025-02-27 - Server-Side Request Forgery via DNS resolution
**Vulnerability:** Found an SSRF vulnerability where user-supplied URLs were validated using string comparison for blacklisting instead of DNS resolution. The blocklist did not prevent resolving domains like nip.io to internal IPs (e.g. `127.0.0.1.nip.io`).
**Learning:** Checking hostnames strictly as strings is insufficient to block SSRF when attackers can map arbitrary domains to internal IPs.
**Prevention:** Implement `dns.lookup` to check the resolved IP against a blocklist before fetching external resources.
