import subprocess
import re

out = subprocess.check_output(['git', 'show', '1ad8d89', '--', 'index.html'], text=True, encoding='utf-8', errors='ignore')
diffs = re.findall(r'-\s+"titre":\s+"(.*?)",\s*\n\+\s+"titre":\s+"(.*?)",', out)
print(f'Total diffs in 1ad8d89: {len(diffs)}')
for b, a in diffs[:30]:
    print(f'[{len(b.split())}w] {b}')
    print(f' -> [{len(a.split())}w] {a}')
