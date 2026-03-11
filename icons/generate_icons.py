#!/usr/bin/env python3
"""
生成Chrome插件所需的图标文件
需要安装PIL库: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("错误: 需要安装PIL库")
    print("请运行: pip install Pillow")
    exit(1)

def create_icon(size, filename):
    """创建图标"""
    # 创建图像
    img = Image.new('RGBA', (size, size), (102, 126, 234, 255))  # 使用主题色
    draw = ImageDraw.Draw(img)
    
    # 绘制圆形背景
    margin = size // 8
    draw.ellipse([margin, margin, size - margin, size - margin], 
                 fill=(255, 255, 255, 255))
    
    # 绘制URL图标（简单的U字母）
    try:
        font_size = size // 2
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    text = "U"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((size - text_width) // 2, (size - text_height) // 2 - text_height // 4)
    
    draw.text(position, text, fill=(102, 126, 234, 255), font=font)
    
    # 保存
    img.save(filename, 'PNG')
    print(f"✓ 已创建: {filename} ({size}x{size})")

def main():
    """主函数"""
    print("正在生成图标文件...")
    print("-" * 40)
    
    sizes = [16, 48, 128]
    for size in sizes:
        filename = f"icon{size}.png"
        create_icon(size, filename)
    
    print("-" * 40)
    print("✓ 所有图标文件已生成完成！")
    print("\n提示: 你可以使用设计工具进一步美化这些图标")

if __name__ == "__main__":
    main()

