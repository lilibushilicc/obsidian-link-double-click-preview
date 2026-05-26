# Link Double Click Preview

An Obsidian plugin that shows a note preview popup when you double-click (or long-press on mobile) a link.

## Features

- **Double-click** any internal or external link to preview the linked note
- **Long-press** on mobile to trigger preview
- **Preview modes**: Floating popover near the link, or centered modal
- **Draggable**: Drag the popup by clicking anywhere on it
- **Document properties**: Shows frontmatter properties (collapsible) at the top of the preview
- **Works in**: Reading mode and Live Preview mode
- **External links**: Clickable URL displayed in the preview
- **Settings**: Customizable popup width, height, and display location

## Usage

1. Install the plugin via Obsidian Community Plugins or [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Go to **Settings → Link Double Click Preview** to configure
3. **Double-click** any link to preview its content
4. Click the **×** button or click outside to close

## Settings

| Setting | Description |
|---------|-------------|
| 弹窗位置 (Popup location) | Popover (near link) or Modal (centered) |
| 弹窗宽度 (Popup width) | Width in pixels |
| 弹窗最大高度 (Popup max height) | Maximum height in pixels |

## Installation

### From Obsidian Community Plugins
Search for "Link Double Click Preview" in **Settings → Community Plugins → Browse**.

### Manual
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/lilibushilicc/obsidian-link-double-click-preview/releases)
2. Copy them to `{your-vault}/.obsidian/plugins/double-click-preview/`
3. Enable the plugin in Obsidian settings

## Development

```bash
git clone https://github.com/lilibushilicc/obsidian-link-double-click-preview
cd obsidian-link-double-click-preview
pnpm install
pnpm build
```

## License

MIT
