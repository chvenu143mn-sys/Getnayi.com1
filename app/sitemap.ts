// @ts-nocheck
// Next.js Compliance Sitemap Generator for SEO and crawling indexing
export default async function sitemap() {
  const baseUrl = 'https://getnayi.com';
  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/auth`, lastModified: new Date() },
    { url: `${baseUrl}/privacy`, lastModified: new Date() },
    { url: `${baseUrl}/terms`, lastModified: new Date() },
  ];
}
