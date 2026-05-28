async function test() {
  const regions = [
    'storage.bunnycdn.com',
    'fs.bunnycdn.com',
    'fra.storage.bunnycdn.com',
    'de.storage.bunnycdn.com'
  ];

  for (const region of regions) {
    try {
      const res = await fetch(`https://${region}/testzone/test.txt`, {
        method: 'PUT',
        headers: {
          'AccessKey': 'invalidpassword'
        }
      });
      console.log(region, res.status, await res.text());
    } catch (e) {
      console.log(region, 'failed:', e.message);
    }
  }
}

test();
