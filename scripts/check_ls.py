import urllib.request
import json
import os
import re

addr = os.environ.get('ANTIGRAVITY_LS_ADDRESS')
csrf = os.environ.get('ANTIGRAVITY_CSRF_TOKEN')
print('Addr:', addr, 'CSRF:', csrf)

try:
    html = urllib.request.urlopen(f'http://{addr}/').read().decode('utf-8')
    scripts = re.findall(r'src=["\']([^"\']+)["\']', html)
    print('Scripts found:', scripts)
    for s in scripts:
        url = f'http://{addr}{s}' if s.startswith('/') else f'http://{addr}/{s}'
        js = urllib.request.urlopen(url).read().decode('utf-8')
        endpoints = set(re.findall(r'["\'](/api/[a-zA-Z0-9_\-/]+)["\']', js))
        print(f'{s} endpoints count:', len(endpoints))
        for ep in sorted(endpoints)[:15]:
            print('  ', ep)
except Exception as e:
    print('Error:', e)
