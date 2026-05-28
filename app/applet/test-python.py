import urllib.request
try:
    req = urllib.request.Request('https://ais-dev-awmdlwr42fzvlieuzkqiej-355917741798.asia-southeast1.run.app/s/v0jn3e', headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    print("Status:", response.status)
    print("URL:", response.url)
    print(response.read().decode('utf-8')[:500])
except Exception as e:
    print(e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8')[:500])
