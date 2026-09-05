import sys

with open('sw.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const CACHE_VERSION = '1.0.1';", "const CACHE_VERSION = '1.0.2';")
content = content.replace("const DATA_CACHE = 'historiaxe-data-v1.0.0';", "const DATA_CACHE = 'historiaxe-data-v1.0.1';")

with open('sw.js', 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print('sw.js updated')
