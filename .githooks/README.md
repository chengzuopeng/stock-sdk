# Git hooks

本目录存放项目共享的 git hooks，通过 `git config core.hooksPath .githooks` 激活。

## 激活方式

```bash
# 自动（推荐）：yarn install 时会通过 prepare 脚本自动激活
yarn install

# 手动：
git config core.hooksPath .githooks
```

## 当前 hooks

| Hook | 作用 |
|------|------|
| `pre-commit` | 当暂存区包含 `src/` 或 `docs-meta/sdk.json` 改动时，自动跑 `yarn docs:meta` 并重新暂存 `website/summary.md` 与 `website/.generated/sdk-meta.json`，避免 CI `docs:check` 失败 |

## 跳过 hook

```bash
# 单次跳过（不推荐 — 会让 CI 失败）
git commit --no-verify

# 局部环境变量跳过（仅跳过 docs sync 步骤）
STOCK_SDK_SKIP_DOCS_HOOK=1 git commit -m "..."
```

## 卸载

```bash
git config --unset core.hooksPath
```
