import { execSync } from "child_process";

try {
  // Try to use the PageSpeed Insights API (without key, IP rate limit)
  const url = "https://ais-pre-awmdlwr42fzvlieuzkqiej-355917741798.asia-southeast1.run.app";
  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`;
  
  const response = await fetch(api);
  const data = await response.json();
  
  if (data.lighthouseResult) {
    const categories = data.lighthouseResult.categories;
    console.log("Performance:", categories.performance.score * 100);
    console.log("Accessibility:", categories.accessibility.score * 100);
    console.log("Best Practices:", categories['best-practices'].score * 100);
    console.log("SEO:", categories.seo.score * 100);
  } else {
    console.log("Error from API:", data);
  }
} catch (e) {
  console.log("Error:", e);
}
