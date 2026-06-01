const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console error: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`Page error: ${err.message}`);
  });
  
  await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log("ERRORS:", errors);
  await browser.close();
})();
