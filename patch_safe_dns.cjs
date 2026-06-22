const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// We need isSafeUrl to return the resolved IP so we can use it to prevent TOCTOU
// Let's rewrite isSafeUrl signature and implementation.

const oldIsSafeUrl = `async function isSafeUrl(targetUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();

    // Preliminary string-based check
    const isIpAddressStr = validator.isIP(hostname) || /^(\\d{1,3}\\.){3}\\d{1,3}$/.test(hostname);
    if (
       hostname === 'localhost' ||
       hostname.endsWith('.localhost') ||
       hostname.startsWith('127.') ||
       hostname.startsWith('169.254.') ||
       hostname.startsWith('10.') ||
       hostname.startsWith('0.') ||
       isIpAddressStr ||
       /^192\\.168\\./.test(hostname) ||
       /^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(hostname) ||
       hostname.includes('0x') ||
       hostname.endsWith('.local')
    ) {
       return false;
    }

    // Resolve DNS to catch domains pointing to internal IPs (e.g. nip.io)
    const { address } = await dns.promises.lookup(hostname);
    if (!address) return false;

    if (
      address.startsWith('127.') ||
      address.startsWith('10.') ||
      address.startsWith('169.254.') ||
      address.startsWith('0.') ||
      /^192\\.168\\./.test(address) ||
      /^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(address) ||
      address === '::1' ||
      address.toLowerCase().startsWith('fc00:') ||
      address.toLowerCase().startsWith('fd00:') ||
      address.toLowerCase().startsWith('fe80:')
    ) {
      return false;
    }

    return true;
  } catch (err) {
    return false; // Fail securely if URL parsing or DNS lookup fails
  }
}`;

const newIsSafeUrl = `async function isSafeUrl(targetUrl: string): Promise<{ isSafe: boolean, ip?: string }> {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { isSafe: false };

    const hostname = parsed.hostname.toLowerCase();

    // Preliminary string-based check
    const isIpAddressStr = validator.isIP(hostname) || /^(\\d{1,3}\\.){3}\\d{1,3}$/.test(hostname);
    if (
       hostname === 'localhost' ||
       hostname.endsWith('.localhost') ||
       hostname.startsWith('127.') ||
       hostname.startsWith('169.254.') ||
       hostname.startsWith('10.') ||
       hostname.startsWith('0.') ||
       isIpAddressStr ||
       /^192\\.168\\./.test(hostname) ||
       /^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(hostname) ||
       hostname.includes('0x') ||
       hostname.endsWith('.local')
    ) {
       return { isSafe: false };
    }

    // Resolve DNS to catch domains pointing to internal IPs (e.g. nip.io)
    const { address } = await dns.promises.lookup(hostname);
    if (!address) return { isSafe: false };

    if (
      address.startsWith('127.') ||
      address.startsWith('10.') ||
      address.startsWith('169.254.') ||
      address.startsWith('0.') ||
      /^192\\.168\\./.test(address) ||
      /^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(address) ||
      address === '::1' ||
      address.toLowerCase().startsWith('fc00:') ||
      address.toLowerCase().startsWith('fd00:') ||
      address.toLowerCase().startsWith('fe80:')
    ) {
      return { isSafe: false };
    }

    return { isSafe: true, ip: address };
  } catch (err) {
    return { isSafe: false }; // Fail securely if URL parsing or DNS lookup fails
  }
}`;

if (code.includes(oldIsSafeUrl)) {
  code = code.replace(oldIsSafeUrl, newIsSafeUrl);
  console.log("Patched isSafeUrl");
}

// Now replace usages of isSafeUrl
code = code.replace(/const safe = await isSafeUrl\(currentUrl\);\n\s*if \(\!safe\) \{/g, `const safeInfo = await isSafeUrl(currentUrl);\n      if (!safeInfo.isSafe || !safeInfo.ip) {`);
code = code.replace(/const safe = await isSafeUrl\(nextUrl\);\n\s*if \(\!safe\) \{/g, `const safeInfo = await isSafeUrl(nextUrl);\n      if (!safeInfo.isSafe || !safeInfo.ip) {`);
code = code.replace(/const safe = await isSafeUrl\(url\.toString\(\)\);\n\s*if \(\!safe\) \{/g, `const safeInfo = await isSafeUrl(url.toString());\n            if (!safeInfo.isSafe) {`);
code = code.replace(/const safe = await isSafeUrl\(url\);\n\s*if \(\!safe\) \{/g, `const safeInfo = await isSafeUrl(url);\n      if (!safeInfo.isSafe) {`);
code = code.replace(/const safe = await isSafeUrl\(nextUrl\);\n\s*if \(safe\) \{/g, `const safeInfo = await isSafeUrl(nextUrl);\n              if (safeInfo.isSafe) {`);

fs.writeFileSync('server.ts', code);
