import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Search for gRPC or HTTP method names in language_server
with open(r'C:\Users\natha\AppData\Local\Programs\Antigravity\resources\app\main.js', 'r', encoding='utf-8', errors='ignore') as f:
    txt = f.read()

matches = re.findall(r'[a-zA-Z0-9_]+Service/[a-zA-Z0-9_]+', txt)
print('gRPC services in main.js:', set(matches)[:20])

matches_http = re.findall(r'https?://[a-zA-Z0-9_:\.\-]+/[a-zA-Z0-9_\-/]+', txt)
print('HTTP endpoints in main.js:', set(matches_http)[:10])
