import sys

with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "else if(nomLower.includes('mytholog')) bgImg = 'assets/images/sub_mythologies.jpg';",
    "else if(nomLower.includes('panth')) bgImg = 'assets/images/sub_mythologies.jpg';"
)

with open('js/app.js', 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print('Fixed app.js')
