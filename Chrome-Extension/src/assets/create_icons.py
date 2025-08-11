from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create a colored background
    img = Image.new('RGBA', (size, size), (102, 126, 234, 255))  # Purple color
    draw = ImageDraw.Draw(img)
    
    # Draw a book emoji-like icon
    # Draw pages
    draw.rectangle([size//4, size//4, size*3//4, size*3//4], fill=(255, 255, 255, 255))
    draw.rectangle([size//4 + 2, size//4 + 2, size*3//4 - 2, size*3//4 - 2], outline=(200, 200, 200, 255))
    
    # Draw some lines to represent text
    line_height = size // 12
    start_y = size // 3
    for i in range(3):
        y = start_y + i * line_height
        draw.rectangle([size//3, y, size*2//3, y + 2], fill=(150, 150, 150, 255))
    
    # Add 词 character if possible
    try:
        # Try to use a system font
        font_size = size // 3
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("simsun.ttc", font_size)
            except:
                font = ImageFont.load_default()
        
        text = "词"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = (size - text_width) // 2
        text_y = (size - text_height) // 2
        draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)
    except:
        # Fallback: draw a simple book shape
        draw.rectangle([size//3, size//6, size*2//3, size*5//6], fill=(255, 255, 255, 200))
    
    img.save(filename, 'PNG')
    print(f"Created {filename}")

# Create icons in different sizes
sizes = [16, 32, 48, 128]
for size in sizes:
    create_icon(size, f"icon{size}.png")

print("All icons created successfully!")