import re

with open('E:/YPWI ABSENSI/public/admin-dashboard.html', 'r') as f:
    content = f.read()

# Count opening and closing tags
opens = len(re.findall(r'<(?!\!--|!DOCTYPE|html)', content))
closes = len(re.findall(r'</', content))
print(f'Opening tags: {opens}, Closing tags: {closes}')

# Check for duplicate IDs
ids = re.findall(r'id="([^"]+)"', content)
dups = [x for x in ids if ids.count(x) > 1]
if dups:
    print(f'Duplicate IDs: {set(dups)}')
else:
    print('No duplicate IDs')

# Check script tag balance
script_opens = content.count('<script')
script_closes = content.count('</script>')
print(f'Script tags: {script_opens} open, {script_closes} close')

# Check for missing </div>
opens_div = content.count('<div')
closes_div = content.count('</div>')
print(f'Div tags: {opens_div} open, {closes_div} close')

# Check form tags
opens_form = content.count('<form')
closes_form = content.count('</form>')
print(f'Form tags: {opens_form} open, {closes_form} close')

# Check for img tags without closing
self_closing = len(re.findall(r'<img[^>]*\s*/>', content))
print(f'Self-closing img tags: {self_closing}')