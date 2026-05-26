# 链接双击预览 (Link Double Click Preview)

在 Obsidian 中双击（手机端长按）链接即可预览笔记内容的插件。

## 功能

- **双击**任意内部或外部链接，弹出预览窗口
- **长按**手机端触发预览
- **两种弹窗模式**：链接附近的浮窗，或屏幕居中的模态框
- **可拖动**：点击弹窗任意位置即可拖动
- **文档属性**：弹窗顶部显示笔记的前置属性（可折叠）
- **支持阅读模式与实时预览模式**
- **外部链接**：弹窗内显示可点击的 URL
- **可配置**：弹窗位置、宽度、最大高度

## 使用方法

1. 安装插件（见下方安装方式）
2. 进入 **设置 → 链接双击预览** 调整配置
3. **双击**任意链接即可预览内容
4. 点击 **×** 按钮或弹窗外区域关闭

## 设置项

| 设置 | 说明 |
|------|------|
| 弹窗位置 | 浮窗（链接附近）或模态框（屏幕居中） |
| 弹窗宽度 | 宽度（像素） |
| 弹窗最大高度 | 最大高度（像素） |

## 安装

### 从社区插件安装
在 **设置 → 社区插件 → 浏览** 中搜索 "Link Double Click Preview"。

### 手动安装
1. 从 [最新发布页](https://github.com/lilibushilicc/obsidian-link-double-click-preview/releases) 下载 `obsidian-link-double-click-preview.zip`
2. 解压到 `你的笔记库/.obsidian/plugins/double-click-preview/`
3. 在 Obsidian 设置中启用插件

## 开发

```bash
git clone https://github.com/lilibushilicc/obsidian-link-double-click-preview
cd obsidian-link-double-click-preview
pnpm install
pnpm build
```

## 许可证

MIT
