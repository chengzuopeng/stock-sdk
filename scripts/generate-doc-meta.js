import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const rootDir = path.resolve(currentDir, '..');

async function readJson(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return JSON.parse(await fs.readFile(absolutePath, 'utf8'));
}

async function readText(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return fs.readFile(absolutePath, 'utf8');
}

function extractInterfaceBody(source, interfaceName) {
  const pattern = new RegExp(
    `export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`,
    'm'
  );
  const match = source.match(pattern);
  return match?.[1] ?? '';
}

function extractOptionalKeys(interfaceBody) {
  return Array.from(
    interfaceBody.matchAll(/^\s*([A-Za-z0-9_]+)\?:/gm),
    (match) => match[1]
  );
}

function extractProviderNames(source) {
  const match = source.match(/export type ProviderName =([\s\S]*?);/m);
  if (!match) {
    return [];
  }
  return Array.from(match[1].matchAll(/'([^']+)'/g), (item) => item[1]);
}

function extractNamedExports(source) {
  const exportNames = [];
  for (const match of source.matchAll(/export \{([^}]+)\} from/g)) {
    const names = match[1]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split(/\s+as\s+/)[0].trim());
    exportNames.push(...names);
  }
  return exportNames;
}

function extractSdkMethods(source) {
  const classMatch = source.match(/export class StockSDK \{([\s\S]*?)\n\}/m);
  if (!classMatch) {
    return [];
  }

  const methods = new Set();
  for (const match of classMatch[1].matchAll(
    /^\s{2}(?:async\s+)?(?!constructor\b)([A-Za-z0-9_]+)\([^)]*\):/gm
  )) {
    methods.add(match[1]);
  }

  return [...methods];
}

async function collectBuildArtifact(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  try {
    const content = await fs.readFile(absolutePath);
    return {
      path: relativePath,
      bytes: content.byteLength,
      gzipBytes: gzipSync(content).byteLength,
    };
  } catch {
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function getRequestOptionType(optionName, docsMeta) {
  switch (optionName) {
    case 'baseUrl':
      return 'string';
    case 'timeout':
      return 'number';
    case 'retry':
      return 'RetryOptions';
    case 'headers':
      return 'Record<string, string>';
    case 'userAgent':
      return 'string';
    case 'rateLimit':
      return docsMeta.requestConfig.rateLimitType;
    case 'rotateUserAgent':
      return 'boolean';
    case 'circuitBreaker':
      return 'CircuitBreakerOptions';
    case 'providerPolicies':
      return docsMeta.requestConfig.providerPoliciesType;
    default:
      return 'unknown';
  }
}

function renderMethodGroup(group, sdkMethods) {
  const methods = group.methods.filter((method) => sdkMethods.includes(method));
  if (methods.length === 0) {
    return '';
  }

  return [
    `### ${group.titleZh}`,
    '',
    methods.map((method) => `- \`${method}\``).join('\n'),
  ].join('\n');
}

function renderSummaryMarkdown(docsMeta, meta) {
  const requestRows = meta.request.optionNames
    .map((optionName) => {
      const type = getRequestOptionType(optionName, docsMeta);
      const description =
        docsMeta.summary.requestOptionDescriptions[optionName] ?? '待补充说明。';
      return `| \`${optionName}\` | \`${type}\` | ${description} |`;
    })
    .join('\n');

  const providerLines = meta.request.providerNames
    .map((providerName) => {
      const description =
        docsMeta.summary.providerDescriptions[providerName] ?? '未配置额外说明。';
      return `- \`${providerName}\`：${description}`;
    })
    .join('\n');

  const buildRows = [meta.build.indexJs, meta.build.indexCjs]
    .filter(Boolean)
    .map((artifact) => {
      const gzipBytes = formatBytes(artifact.gzipBytes);
      return `| \`${artifact.path}\` | ${formatBytes(artifact.bytes)} | ${gzipBytes} |`;
    })
    .join('\n');

  const methodGroups = docsMeta.summary.methodGroups
    .map((group) => renderMethodGroup(group, meta.sdk.methods))
    .filter(Boolean)
    .join('\n\n');

  return `# Stock SDK 文档总览

> 此页面由脚本自动生成，请不要手动编辑。
> 生成时间：${meta.generatedAt}

## 项目定位

- 包名：\`${meta.package.name}\`
- 当前版本：\`${meta.package.version}\`
- 定位：${docsMeta.site.descriptionZh}
- 核心卖点：${docsMeta.marketing.taglineZh}

## 构建产物

| 文件 | 体积 | Gzip |
| --- | --- | --- |
${buildRows}

## 请求治理能力

| 配置项 | 类型 | 说明 |
| --- | --- | --- |
${requestRows}

### Provider 策略覆盖

${providerLines}

## 技术指标能力

- 支持的 \`IndicatorOptions\` 键：${meta.indicators.optionKeys
    .map((key) => `\`${key}\``)
    .join('、')}
- 独立导出的计算函数：${meta.indicators.calcMethods
    .map((method) => `\`${method}\``)
    .join('、')}

## SDK 方法分组

${methodGroups}

## 相关页面

- [快速开始](/guide/getting-started)
- [错误处理与重试](/guide/retry)
- [请求治理](/guide/request-governance)
- [期货与期权](/guide/futures-options)
- [分红与交易日历](/guide/dividend-calendar)
- [API 总览](/api/)
`;
}

export async function generateDocMeta(options = {}) {
  const { write = true } = options;
  const [packageJson, docsMeta, requestSource, indicatorTypesSource, indicatorIndexSource, sdkSource] =
    await Promise.all([
      readJson('package.json'),
      readJson('docs-meta/sdk.json'),
      readText('src/core/request.ts'),
      readText('src/indicators/types.ts'),
      readText('src/indicators/index.ts'),
      readText('src/sdk.ts'),
    ]);

  const indicatorOptionsBody = extractInterfaceBody(
    indicatorTypesSource,
    'IndicatorOptions'
  );
  const requestOptionsBody = extractInterfaceBody(
    requestSource,
    'RequestClientOptions'
  );
  const indicatorExports = extractNamedExports(indicatorIndexSource).filter((name) =>
    name.startsWith('calc')
  );
  const [indexJs, indexCjs] = await Promise.all([
    collectBuildArtifact('dist/index.js'),
    collectBuildArtifact('dist/index.cjs'),
  ]);

  const meta = {
    generatedAt: new Date().toISOString(),
    package: {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
    },
    marketing: docsMeta.marketing,
    request: {
      optionNames: extractOptionalKeys(requestOptionsBody),
      providerNames: extractProviderNames(requestSource),
      rateLimitType: docsMeta.requestConfig.rateLimitType,
      providerPoliciesType: docsMeta.requestConfig.providerPoliciesType,
    },
    indicators: {
      optionKeys: extractOptionalKeys(indicatorOptionsBody),
      calcMethods: indicatorExports,
    },
    sdk: {
      methods: extractSdkMethods(sdkSource),
    },
    build: {
      indexJs,
      indexCjs,
      formatted: {
        indexJs: indexJs ? formatBytes(indexJs.bytes) : null,
        indexCjs: indexCjs ? formatBytes(indexCjs.bytes) : null,
      },
    },
  };

  if (write) {
    const generatedDir = path.join(rootDir, 'website/.generated');
    const metaOutputPath = path.join(generatedDir, 'sdk-meta.json');
    const summaryOutputPath = path.join(rootDir, 'website/summary.md');
    await fs.mkdir(generatedDir, { recursive: true });
    await fs.writeFile(metaOutputPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    await fs.writeFile(
      summaryOutputPath,
      `${renderSummaryMarkdown(docsMeta, meta)}\n`,
      'utf8'
    );
  }

  return meta;
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  await generateDocMeta();
  console.log('Generated website/.generated/sdk-meta.json');
  console.log('Generated website/summary.md');
}
