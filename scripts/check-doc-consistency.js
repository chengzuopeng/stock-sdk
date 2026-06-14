import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateDocMeta,
  renderSummaryMarkdown,
} from './generate-doc-meta.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const rootDir = path.resolve(currentDir, '..');
const docsDir = process.env.DOCS_DIR || 'site-v2';

async function readJson(relativePath) {
  return JSON.parse(
    await fs.readFile(path.join(rootDir, relativePath), 'utf8')
  );
}

async function readText(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), 'utf8');
}

async function listMarkdownFiles(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(relativePath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }

  return files;
}

function compareExactArray(label, expected, actual, errors) {
  const expectedValue = JSON.stringify(expected);
  const actualValue = JSON.stringify(actual);
  if (expectedValue !== actualValue) {
    errors.push(
      `${label} mismatch. expected=${expectedValue} actual=${actualValue}`
    );
  }
}

function isIgnoredParityPath(relativePath, ignoredPatterns) {
  return ignoredPatterns.some((pattern) =>
    relativePath === pattern || relativePath.startsWith(pattern)
  );
}

const docsMeta = await readJson('docs-meta/sdk.json');
const generatedMeta = await generateDocMeta({ write: false });
const errors = [];
const docsMarkdownFiles = await listMarkdownFiles(docsDir);
const docFilesToScan = ['README.md', 'README_EN.md', ...docsMarkdownFiles];
const docsRelativeFiles = new Set(
  docsMarkdownFiles.map((file) => file.replace(new RegExp(`^${docsDir}/`), ''))
);

compareExactArray(
  'RequestClientOptions keys',
  docsMeta.requestConfig.optionNames,
  generatedMeta.request.optionNames,
  errors
);
compareExactArray(
  'ProviderName values',
  docsMeta.requestConfig.providerNames,
  generatedMeta.request.providerNames,
  errors
);
compareExactArray(
  'IndicatorOptions keys',
  docsMeta.indicatorKeys,
  generatedMeta.indicators.optionKeys,
  errors
);

for (const method of docsMeta.indicatorMethods) {
  if (!generatedMeta.indicators.calcMethods.includes(method)) {
    errors.push(`Missing indicator export: ${method}`);
  }
}

for (const group of docsMeta.summary.methodGroups) {
  for (const method of group.methods) {
    if (!generatedMeta.sdk.methods.includes(method)) {
      errors.push(`Summary method group references missing SDK method: ${method}`);
    }
  }
}

// R3-13:反向覆盖校验 —— 每个 SDK 方法必须归属于至少一个 methodGroup,
// 新增方法忘记进组时 check 直接红。确属不进 summary 分组的方法须显式登记
// 到 docs-meta/sdk.json 的 summary.methodGroupExemptions(当前为空)。
const groupedMethods = new Set(
  docsMeta.summary.methodGroups.flatMap((group) => group.methods)
);
const methodGroupExemptions = new Set(
  docsMeta.summary.methodGroupExemptions ?? []
);
for (const method of generatedMeta.sdk.methods) {
  if (!groupedMethods.has(method) && !methodGroupExemptions.has(method)) {
    errors.push(
      `SDK method is not listed in any summary.methodGroups (add it to a group or to summary.methodGroupExemptions): ${method}`
    );
  }
}

const expectedSummary = `${renderSummaryMarkdown(docsMeta, generatedMeta)}\n`;
const summaryPath = `${docsDir}/summary.md`;
const actualSummary = await readText(summaryPath);
if (actualSummary !== expectedSummary) {
  errors.push(`${summaryPath} is out of date. Run \`yarn docs:meta\`.`);
}

for (const [file, requiredTokens] of Object.entries(
  docsMeta.docExpectations.requiredTokensByFile
)) {
  if (docsDir !== 'website' && !file.startsWith(`${docsDir}/`)) {
    continue;
  }
  const content = await readText(file);

  for (const token of requiredTokens) {
    if (!content.includes(token)) {
      errors.push(`${file} is missing required token: ${token}`);
    }
  }

  for (const token of docsMeta.forbiddenTokens) {
    if (content.includes(token)) {
      errors.push(`${file} still contains forbidden token: ${token}`);
    }
  }
}

for (const file of docFilesToScan) {
  const content = await readText(file);
  for (const token of docsMeta.forbiddenTokens) {
    if (content.includes(token)) {
      errors.push(`${file} still contains forbidden token: ${token}`);
    }
  }
}

const parityIgnore = docsMeta.docExpectations.parityIgnore ?? [];

for (const relativePath of docsRelativeFiles) {
  if (relativePath.startsWith('en/')) {
    const zhPath = relativePath.replace(/^en\//, '');
    if (
      !isIgnoredParityPath(zhPath, parityIgnore) &&
      !docsRelativeFiles.has(zhPath)
    ) {
      errors.push(`Missing Chinese mirror for ${docsDir}/en/${zhPath}`);
    }
    continue;
  }

  if (isIgnoredParityPath(relativePath, parityIgnore)) {
    continue;
  }

  const enPath = `en/${relativePath}`;
  if (!docsRelativeFiles.has(enPath)) {
    errors.push(`Missing English mirror for ${docsDir}/${relativePath}`);
  }
}

if (errors.length > 0) {
  console.error('Documentation consistency check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Documentation consistency check passed.');
