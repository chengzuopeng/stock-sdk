#!/usr/bin/env node
/**
 * 通过 `yarn install` / `npm install` 触发的 prepare 脚本：
 * 把 git hooks 路径指向项目根目录的 `.githooks/`，让所有协作者
 * 自动启用 pre-commit 等共享钩子。
 *
 * 行为：
 *  - 仅在仓库 .git 目录存在时生效（npm 包消费场景下安全跳过）
 *  - 不会覆盖用户已经设置的 core.hooksPath（除非指向同一路径）
 *  - 任何错误都不会中断 install（避免 CI 安装失败）
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const hooksDir = '.githooks';

function quietExec(cmd) {
  try {
    return execSync(cmd, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

// 1. 仅在本地 git 仓库内启用（被作为 npm 依赖安装时跳过）
if (!existsSync(join(repoRoot, '.git'))) {
  process.exit(0);
}

// 2. 检查 .githooks/ 是否存在
if (!existsSync(join(repoRoot, hooksDir))) {
  process.exit(0);
}

// 3. 读取当前配置，如果已经指向 .githooks 就不重复设置
const current = quietExec('git config --get core.hooksPath');
if (current === hooksDir) {
  process.exit(0);
}

// 4. 设置 core.hooksPath
const ok = quietExec(`git config core.hooksPath ${hooksDir}`);
if (ok !== null) {
  // eslint-disable-next-line no-console
  console.log(`[install-git-hooks] core.hooksPath -> ${hooksDir}`);
} else {
  // 失败也不阻断 install
  // eslint-disable-next-line no-console
  console.warn('[install-git-hooks] 未能设置 core.hooksPath，可手动执行：git config core.hooksPath .githooks');
}
