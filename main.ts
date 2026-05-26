import {
    App,
    Component,
    MarkdownRenderer,
    MarkdownView,
    Modal,
    Plugin,
    PluginSettingTab,
    Setting,
    TFile,
} from "obsidian";

interface Settings {
    popupStyle: "modal" | "popover";
    popupWidth: number;
    popupHeight: number;
}

const DEFAULT_SETTINGS: Settings = {
    popupStyle: "modal",
    popupWidth: 650,
    popupHeight: 500,
};

export default class DoubleClickPreviewPlugin extends Plugin {
    settings: Settings;
    private popoverEl: HTMLElement | null = null;
    private popoverComponent: Component | null = null;
    private clickHref: string | null = null;
    private clickTime: number = 0;
    private clickSource: string = "";
    private clickRect: DOMRect | null = null;
    private navTimer: number | null = null;
    private boundHandler: ((evt: MouseEvent) => void) | null = null;
    private isTouchDevice: boolean;
    private touchTimer: number | null = null;
    private touchHref: string | null = null;
    private touchRect: DOMRect | null = null;
    private touchPreventClick: boolean = false;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new SettingTab(this.app, this));

        this.isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

        this.boundHandler = (evt: MouseEvent) => this.onClick(evt);
        document.addEventListener("click", this.boundHandler, true);

        if (this.isTouchDevice) {
            this.registerDomEvent(document, "touchstart", (evt) =>
                this.onTouchStart(evt)
            );
            this.registerDomEvent(document, "touchend", () =>
                this.onTouchEnd()
            );
            this.registerDomEvent(document, "touchmove", () =>
                this.onTouchMove()
            );
            this.registerDomEvent(document, "contextmenu", (evt) =>
                this.onTouchContextMenu(evt)
            );
        }

        this.register(() => {
            if (this.boundHandler) {
                document.removeEventListener("click", this.boundHandler, true);
            }
            this.clearTimer();
        });
    }

    onunload() {
        this.closePopover();
    }

    private onTouchStart(evt: TouchEvent) {
        const target = evt.target as HTMLElement;
        if (target.closest(".link-preview-popover, .modal-container")) return;

        const linkEl = target.closest(
            "a.internal-link, a.external-link, .cm-hmd-internal-link, .cm-url, [data-href]"
        );
        if (!linkEl) return;

        const href = this.getHref(linkEl);
        if (!href) return;

        this.touchHref = href;
        this.touchRect = linkEl.getBoundingClientRect();

        this.touchTimer = window.setTimeout(() => {
            this.touchTimer = null;
            this.touchPreventClick = true;
            if (this.touchHref && this.touchRect) {
                this.openPreview(this.touchHref, this.touchRect);
            }
        }, 500);
    }

    private onTouchEnd() {
        if (this.touchTimer !== null) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
        }
    }

    private onTouchMove() {
        if (this.touchTimer !== null) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
        }
    }

    private onTouchContextMenu(evt: MouseEvent) {
        if (this.touchTimer !== null) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
            this.touchPreventClick = true;
            if (this.touchHref && this.touchRect) {
                this.openPreview(this.touchHref, this.touchRect);
            }
            evt.preventDefault();
        } else if (this.touchPreventClick) {
            evt.preventDefault();
            this.touchPreventClick = false;
        }
    }

    private clearTimer() {
        if (this.navTimer !== null) {
            clearTimeout(this.navTimer);
            this.navTimer = null;
        }
    }

    async loadSettings() {
        const data = await this.loadData() as Partial<Settings>;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private getSourcePath(): string {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        return view?.file?.path ?? "";
    }

    private getHref(el: Element): string | null {
        let href = el.getAttribute("data-href");
        if (href) return href;

        href = el.getAttribute("href");
        if (href) return href;

        if (el.classList.contains("cm-url")) {
            const text = el.textContent || "";
            href = text.replace(/^\(/, "").replace(/\)$/, "");
            if (href) return href;
        }

        return null;
    }

    private onClick(evt: MouseEvent) {
        const target = evt.target as HTMLElement;

        if (target.closest(".link-preview-popover, .modal-container")) return;

        const linkEl = target.closest(
            "a.internal-link, a.external-link, .cm-hmd-internal-link, .cm-url, [data-href]"
        );
        if (!linkEl) {
            this.clickHref = null;
            this.clearTimer();
            return;
        }

        const href = this.getHref(linkEl);
        if (!href) {
            this.clickHref = null;
            this.clearTimer();
            return;
        }

        const now = Date.now();

        if (this.clickHref && now - this.clickTime < 650) {
            this.clearTimer();
            this.clickHref = null;
            evt.preventDefault();
            evt.stopPropagation();

            const rect = linkEl.getBoundingClientRect();
            this.openPreview(href, rect);
            return;
        }

        this.clickHref = href;
        this.clickTime = now;
        this.clickSource = this.getSourcePath();
        this.clickRect = linkEl.getBoundingClientRect();

        evt.preventDefault();
        evt.stopPropagation();

        this.clearTimer();
        this.navTimer = window.setTimeout(() => {
            this.navTimer = null;
            this.clickHref = null;
            this.navigateTo(href, this.clickSource);
        }, 650);
    }

    private navigateTo(href: string, sourcePath: string) {
        if (href.startsWith("http://") || href.startsWith("https://")) {
            window.open(href);
            return;
        }

        const file = this.app.metadataCache.getFirstLinkpathDest(href, sourcePath);
        if (file) {
            const leaf = this.app.workspace.getLeaf(false);
            if (leaf) {
                leaf.openFile(file);
                return;
            }
        }

        try {
            this.app.workspace.openLinkText(href, sourcePath);
        } catch {
            // silent
        }
    }

    private async openPreview(href: string, rect: DOMRect) {
        if (href.startsWith("http://") || href.startsWith("https://")) {
            this.showExternal(href, rect);
        } else {
            await this.showInternal(href, rect);
        }
    }

    private renderProperties(container: HTMLElement, file: TFile | null) {
        if (!file) return;
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache?.frontmatter) return;

        const details = container.createEl("details", {
            cls: "link-preview-properties",
        });
        const summary = details.createEl("summary", {
            cls: "link-preview-properties-header",
            text: "文档属性",
        });
        for (const [k, v] of Object.entries(cache.frontmatter)) {
            if (k === "position" || k === "sticky") continue;
            const row = details.createDiv("link-preview-prop-row");
            row.createSpan({ text: k, cls: "link-preview-prop-key" });
            row.createSpan({ text: String(v), cls: "link-preview-prop-value" });
        }
    }

    private async showInternal(href: string, rect: DOMRect) {
        const sourcePath = this.getSourcePath();
        const file = this.app.metadataCache.getFirstLinkpathDest(href, sourcePath);
        if (!file) return;

        const content = await this.app.vault.cachedRead(file);

        if (this.settings.popupStyle === "modal") {
            new PreviewModal(this.app, file.name, content, file.path, file, this).open();
        } else {
            this.showPopover(content, file.path, file.name, file, rect);
        }
    }

    private async showExternal(url: string, rect: DOMRect) {
        const content = `[${url}](${url})`;
        if (this.settings.popupStyle === "modal") {
            new PreviewModal(this.app, "External Link", content, "", null, this).open();
        } else {
            this.showPopover(content, "", url, null, rect);
        }
    }

    private showPopover(content: string, sourcePath: string, title: string, file: TFile | null, rect: DOMRect) {
        this.closePopover();

        const el = document.body.createDiv("link-preview-popover");
        el.style.width = `${this.settings.popupWidth}px`;
        el.style.maxHeight = `${this.settings.popupHeight}px`;

        const header = el.createDiv("link-preview-popover-header");
        header.createSpan({ text: title });
        const close = header.createEl("button", {
            cls: "link-preview-popover-close",
            text: "\u00d7",
        });
        close.addEventListener("click", () => this.closePopover());

        const body = el.createDiv("link-preview-popover-content");
        this.renderProperties(body, file);
        const cmp = new Component();
        cmp.load();
        MarkdownRenderer.render(this.app, content, body, sourcePath, cmp);

        this.popoverComponent = cmp;
        this.popoverEl = el;

        document.body.appendChild(el);
        const sz = el.getBoundingClientRect();

        let top = rect.bottom + 6;
        let left = Math.max(6, rect.left);

        if (top + sz.height > window.innerHeight) {
            top = Math.max(6, rect.top - sz.height - 6);
        }
        if (left + sz.width > window.innerWidth) {
            left = Math.max(6, window.innerWidth - sz.width - 6);
        }

        el.style.top = `${top}px`;
        el.style.left = `${left}px`;

        requestAnimationFrame(() => el.classList.add("is-visible"));

        this.makeDraggable(el, el);

        const closeHandler = (e: MouseEvent) => {
            if (!el.contains(e.target as Node)) {
                this.closePopover();
                document.removeEventListener("click", closeHandler);
            }
        };
        setTimeout(() => document.addEventListener("click", closeHandler), 0);
    }

    private makeDraggable(handle: HTMLElement, target: HTMLElement) {
        let startX = 0, startY = 0, origX = 0, origY = 0;

        const onStart = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest("button, a, input, textarea")) return;
            startX = e.clientX;
            startY = e.clientY;
            origX = parseInt(target.style.left) || 0;
            origY = parseInt(target.style.top) || 0;
            target.classList.add("is-dragging");
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onEnd);
            e.preventDefault();
        };

        const onMove = (e: MouseEvent) => {
            target.style.left = `${origX + e.clientX - startX}px`;
            target.style.top = `${origY + e.clientY - startY}px`;
        };

        const onEnd = () => {
            target.classList.remove("is-dragging");
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onEnd);
        };

        handle.addEventListener("mousedown", onStart);
    }

    private closePopover() {
        if (this.popoverComponent) {
            this.popoverComponent.unload();
            this.popoverComponent = null;
        }
        if (this.popoverEl) {
            this.popoverEl.remove();
            this.popoverEl = null;
        }
    }
}

class PreviewModal extends Modal {
    private title: string;
    private content: string;
    private sourcePath: string;
    private file: TFile | null;
    private plugin: DoubleClickPreviewPlugin;

    constructor(
        app: App,
        title: string,
        content: string,
        sourcePath: string,
        file: TFile | null,
        plugin: DoubleClickPreviewPlugin
    ) {
        super(app);
        this.title = title;
        this.content = content;
        this.sourcePath = sourcePath;
        this.file = file;
        this.plugin = plugin;
    }

    onOpen() {
        this.modalEl.style.width = `${this.plugin.settings.popupWidth}px`;
        this.modalEl.style.maxHeight = `${this.plugin.settings.popupHeight}px`;

        this.contentEl.empty();
        const titleEl = this.contentEl.createDiv("link-preview-modal-title");
        titleEl.setText(this.title);

        this.makeDraggable(this.modalEl, this.modalEl);

        const preview = this.contentEl.createDiv("link-preview-modal-content");
        this.plugin.renderProperties(preview, this.file);
        MarkdownRenderer.render(this.app, this.content, preview, this.sourcePath, this);
    }

    onClose() {
        this.contentEl.empty();
    }

    private makeDraggable(handle: HTMLElement, target: HTMLElement) {
        let startX = 0, startY = 0, origX = 0, origY = 0;

        const onStart = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest("button, a, input, textarea")) return;
            startX = e.clientX;
            startY = e.clientY;
            origX = parseInt(target.style.left) || 0;
            origY = parseInt(target.style.top) || 0;
            target.style.removeProperty("margin");
            target.classList.add("is-dragging");
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onEnd);
            e.preventDefault();
        };

        const onMove = (e: MouseEvent) => {
            target.style.left = `${origX + e.clientX - startX}px`;
            target.style.top = `${origY + e.clientY - startY}px`;
        };

        const onEnd = () => {
            target.classList.remove("is-dragging");
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onEnd);
        };

        handle.addEventListener("mousedown", onStart);
    }
}

class SettingTab extends PluginSettingTab {
    plugin: DoubleClickPreviewPlugin;

    constructor(app: App, plugin: DoubleClickPreviewPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("弹窗位置")
            .setDesc("选择预览的显示位置")
            .addDropdown((d) =>
                d.addOption("popover", "浮窗（链接附近）")
                    .addOption("modal", "模态框（屏幕居中）")
                    .setValue(this.plugin.settings.popupStyle)
                    .onChange(async (v: "modal" | "popover") => {
                        this.plugin.settings.popupStyle = v;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("弹窗宽度")
            .setDesc("宽度（像素）")
            .addText((t) =>
                t.setPlaceholder("650")
                    .setValue(String(this.plugin.settings.popupWidth))
                    .onChange(async (v) => {
                        const n = parseInt(v);
                        if (!isNaN(n) && n > 0) {
                            this.plugin.settings.popupWidth = n;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName("弹窗最大高度")
            .setDesc("最大高度（像素）")
            .addText((t) =>
                t.setPlaceholder("500")
                    .setValue(String(this.plugin.settings.popupHeight))
                    .onChange(async (v) => {
                        const n = parseInt(v);
                        if (!isNaN(n) && n > 0) {
                            this.plugin.settings.popupHeight = n;
                            await this.plugin.saveSettings();
                        }
                    })
            );
    }
}
