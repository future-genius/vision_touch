import os
from PIL import Image, ImageDraw

def create_icon(size, filename):
    img = Image.new('RGB', (size, size), color = '#1E3A5F')
    d = ImageDraw.Draw(img)
    # Draw a simple white square in the middle to represent a "Hand" bounding box
    margin = size // 4
    d.rectangle([margin, margin, size-margin, size-margin], outline="white", width=max(2, size//20))
    # Draw some text
    # This is just a placeholder icon
    img.save(os.path.join('public', filename))

if not os.path.exists('public'):
    os.makedirs('public')

create_icon(192, 'pwa-192x192.png')
create_icon(512, 'pwa-512x512.png')
print("Icons generated.")
