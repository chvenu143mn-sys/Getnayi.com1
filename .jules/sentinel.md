## 2025-02-27 - Server-Side Request Forgery via DNS resolution
**Vulnerability:** Found an SSRF vulnerability where user-supplied URLs were validated using string comparison for blacklisting instead of DNS resolution. The blocklist did not prevent resolving domains like nip.io to internal IPs (e.g. `127.0.0.1.nip.io`).
**Learning:** Checking hostnames strictly as strings is insufficient to block SSRF when attackers can map arbitrary domains to internal IPs.
**Prevention:** Implement `dns.lookup` to check the resolved IP against a blocklist before fetching external resources.

## 2026-06-21 - SSRF and DNS Rebinding Prevention in Outbound Requests
 **Vulnerability:** SSRF bypass allowing fetch to follow redirects to internal IPs or bypassing hostname checks via alternative IP formats (octal/decimal) and DNS Rebinding (TOCTOU).
 **Learning:** Standard `fetch()` blindly follows redirects and connects based on the hostname. Checking a URL prior to calling fetch is insufficient because the server can respond with a redirect to a malicious target (e.g. `169.254.169.254`), or the DNS mapping could change between the initial check and the actual fetch execution.
 **Prevention:** Implement a custom request function using `http(s).request` that manually follows redirects up to a maximum limit, explicitly validates the URL at each hop using `dns.promises.lookup`, and overrides the `lookup` option to bind the connection directly to the pre-verified IP address.
