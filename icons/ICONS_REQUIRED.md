# 图标文件清单

## ✅ 必需文件（3个）

根据 `manifest.json` 的配置，`icons` 目录下**必须**包含以下文件：

```
icons/
├── icon16.png   ← 16x16 像素（必需）
├── icon48.png   ← 48x48 像素（必需）
└── icon128.png  ← 128x128 像素（必需）
```

## 📋 文件说明

### icon16.png (16x16)
- **用途**: 浏览器工具栏显示的小图标
- **位置**: 浏览器右上角工具栏
- **要求**: 清晰、简洁，在小尺寸下也能识别

### icon48.png (48x48)
- **用途**: Chrome扩展程序管理页面显示的图标
- **位置**: `chrome://extensions/` 页面
- **要求**: 中等尺寸，需要清晰显示

### icon128.png (128x128)
- **用途**: Chrome Web Store 和扩展程序详情页显示
- **位置**: 扩展程序详情页、Chrome Web Store
- **要求**: 高质量，可以展示更多细节

## 🚀 快速生成占位图标

如果你还没有图标，可以使用以下方法快速生成：

### 方法1: 使用Python脚本（推荐）

```bash
cd icons
python3 generate_icons.py
```

**前提条件**: 需要安装PIL库
```bash
pip install Pillow
```

### 方法2: 手动创建

1. 使用任何图片编辑工具（如Photoshop、GIMP、在线工具）
2. 创建三个不同尺寸的正方形图片
3. 保存为PNG格式
4. 命名为 `icon16.png`, `icon48.png`, `icon128.png`
5. 放置到 `icons/` 目录

### 方法3: 从图标库下载

访问以下网站下载合适的图标：
- [Flaticon](https://www.flaticon.com/)
- [Icons8](https://icons8.com/)
- [Material Icons](https://fonts.google.com/icons)

下载后调整尺寸并重命名。

## ⚠️ 注意事项

1. **文件格式**: 必须是PNG格式
2. **文件命名**: 必须严格按照 `icon16.png`, `icon48.png`, `icon128.png` 命名
3. **文件位置**: 必须放在 `icons/` 目录下
4. **缺失影响**: 如果缺少图标文件，插件仍然可以工作，但会显示默认的灰色图标

## ✅ 检查清单

安装插件前，请确认：
- [ ] `icons/icon16.png` 存在
- [ ] `icons/icon48.png` 存在  
- [ ] `icons/icon128.png` 存在
- [ ] 所有文件都是PNG格式
- [ ] 文件命名正确（区分大小写）

