# Clawlike 主题

这个分支在 Markdown Preview Enhanced 上加了两个预览主题：亮色 `clawlike-g2.css`，暗色 `clawlike-dark.css`。它们出现在预览右键菜单的「预览主题」里。

## 编译

推送到 `clawlike` 分支后，`.github/workflows/build-vsix.yml` 会自动构建、测试并打包，VSIX 在这次运行页面的 Artifacts 里。本地不需要构建。

## 安装

1. 在 VS Code 里卸载官方的 Markdown Preview Enhanced。两者的命令和编辑器 ID 相同，不能同时启用。
2. 解压下载的 Artifact，然后执行 `Extensions: Install from VSIX...`，选择里面的 `.vsix`。

设置项的名字没有变，原来的 `markdown-preview-enhanced.*` 设置继续有效。这个版本的发布者是 `chaosnap`，VS Code 不会用商店里的官方版本覆盖它，也不会自动更新它，要升级就重新安装新的 VSIX。

## 文件

| 文件 | 作用 |
| --- | --- |
| `apply.js` | `pnpm build` 的最后一步：把菜单项和主题登记进构建产物，再装上主题文件 |
| `themes/` | Typora 主题原文和字体目录，保持和 Typora 里的一致 |
| `adapter.css` | 把 Typora 的排版映射到插件的 DOM，接在两个主题后面 |
| `prism/` | 代码块配色（VS Code Light+ / Dark+）和滚动条颜色，也接在主题后面 |

代码块配色写在主题里，始终跟着主题走，所以右键菜单的「代码块主题」对这两个主题不起作用。

菜单、代码块配色映射和亮暗配对都在依赖 `crossnote` 里，它发布的是压缩后的代码，所以 `apply.js` 在构建产物上打补丁。每处必须正好匹配一次，否则构建失败。

## 改动的上游文件

| 文件 | 改动 |
| --- | --- |
| `package.json` | 发布者、显示名和仓库地址，设置页的两个主题选项，`build` 脚本接上 `apply.js` |
| `src/notebooks-manager.ts` | 跟随明暗时在两个主题之间切换（标有 `[clawlike]`） |
| `.vscodeignore` | 不把 `clawlike/` 打进 VSIX |
| `.github/workflows/build-vsix.yml` | 新增的打包工作流 |

## 跟随 VS Code 明暗

默认按菜单里选的主题显示。想让预览随编辑器的亮色 / 暗色主题自动切换，在 `settings.json` 里加：

```json
"markdown-preview-enhanced.previewColorScheme": "editorColorScheme"
```

要跟随系统就写 `systemColorScheme`。

## 同步上游

`develop` 分支保持和上游一致。上游发布新版后，把它合并到这个分支再推送：

```bash
git remote add upstream https://github.com/shd101wyy/vscode-markdown-preview-enhanced.git
```

```bash
git fetch upstream
```

```bash
git merge upstream/develop
```

```bash
git push
```

如果构建报 `expected 1 match`，说明新版 `crossnote` 的内部代码变了，要调整 `apply.js` 里对应的匹配规则。

## 和 Typora 不同的地方

- 表格：插件的表格没有外层容器，五列及以上时改为在表格内部横向滚动，这类表格内容少时不会撑满宽度。
- 单元格的最小宽度和内边距随窗口收窄，方便 VS Code 分栏预览。
- Mermaid 的配色由 `markdown-preview-enhanced.mermaidTheme` 决定，不跟随预览主题；暗色主题下连线偏暗时可以把它设成 `dark`。
- 主题的 `--font-mono` 用的是 Styrene B，它是本机安装的字体，不在仓库里；没有安装时会退回系统无衬线字体。`themes/clawlike/fonts/` 里的 JetBrains Mono（`Codex Code`）已声明但没有被引用，要用它就改 `--font-mono`。
