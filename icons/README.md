# 图标文件说明

## 必需文件

本目录需要包含以下三个PNG图标文件：

| 文件名 | 尺寸 | 用途 |
|--------|------|------|
| `icon16.png` | 16x16 像素 | 浏览器工具栏小图标 |
| `icon48.png` | 48x48 像素 | 扩展程序管理页面图标 |
| `icon128.png` | 128x128 像素 | Chrome Web Store 和扩展程序详情页图标 |

## 如何获取图标

### 方法1: 使用在线工具生成
1. 访问 [Favicon Generator](https://www.favicon-generator.org/)
2. 上传你的图标图片
3. 下载生成的图标文件
4. 重命名并放置到本目录

### 方法2: 使用设计工具
使用 Photoshop、GIMP、Figma、Sketch 等工具：
1. 创建一个正方形画布（建议至少 128x128）
2. 设计你的图标
3. 导出为三个不同尺寸的PNG文件

### 方法3: 从图标库下载
- [Flaticon](https://www.flaticon.com/) - 免费图标库
- [Icons8](https://icons8.com/) - 图标和插画
- [Material Icons](https://fonts.google.com/icons) - Google Material Design图标

### 方法4: 使用Python脚本生成占位图标
如果你安装了Python和PIL库，可以运行以下命令生成简单的占位图标：

```bash
python3 generate_icons.py
```

## 图标设计建议

- **主题**: 建议使用与URL、链接、参数、解析相关的图标
- **颜色**: 使用清晰、对比度高的颜色
- **风格**: 简洁明了，在小尺寸下也能清晰识别
- **格式**: PNG格式，支持透明背景

## 推荐图标主题

- 🔗 链接/链条图标
- 📋 列表/文档图标
- ⚙️ 设置/工具图标
- 🔍 搜索/放大镜图标
- 📊 数据/图表图标

## 注意事项

- 如果没有图标文件，插件仍然可以正常工作，但Chrome会显示默认的灰色图标
- 图标文件必须是PNG格式
- 建议使用透明背景
- 确保图标在不同尺寸下都清晰可见
