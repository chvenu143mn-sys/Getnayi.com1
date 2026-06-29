import fs from "fs";

async function run() {
  const baseUrl = "http://localhost:3000";
  console.log("Starting API tests...");

  // Test 404
  const res404 = await fetch(`${baseUrl}/api/does-not-exist`);
  console.log("404 Test:", res404.status);

  // Test feed (no auth)
  const resFeed = await fetch(`${baseUrl}/api/feed`);
  console.log("Feed Test:", resFeed.status, await resFeed.text().then(t => t.substring(0, 50)));
  
  // Test feed trending
  const resFeedTrending = await fetch(`${baseUrl}/api/feed?tab=trending&limit=2`);
  console.log("Feed Trending Test:", resFeedTrending.status);

  // Test comments
  const resComments = await fetch(`${baseUrl}/api/comments?video_id=some-id`);
  console.log("Comments Test:", resComments.status);

  // Test health
  const resHealth = await fetch(`${baseUrl}/api/health`);
  console.log("Health Test:", resHealth.status);

  // Test missing auth for authenticated routes
  const resMe = await fetch(`${baseUrl}/api/profiles/me`);
  console.log("Me Test (No Auth):", resMe.status);
  
  console.log("API tests completed.");
}

run().catch(console.error);
