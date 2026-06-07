# Playground

在浏览器里直接调用 stock-sdk v2、即时查看返回结果的交互演示区。

## 即将上线

Playground 正在随 v2 SDK 的实现一起接通。v1 文档站已有一套按方法分类的交互组件（16 个分类、可在线编辑参数并运行），它们会迁移到 v2 站，并把所有调用从 v1 的扁平写法改成 **命名空间调用**：

```ts
// v1（旧）
const [quote] = await sdk.getFullQuotes(['sh600519'])

// v2（Playground 将采用的写法）
const [quote] = await sdk.quotes.cn(['sh600519'])
```

接通后，你可以在页面里：

- 选择命名空间与方法（`sdk.quotes.cn` / `sdk.kline.cn` / `sdk.options.etf.dailyKline` …）
- 编辑符号与参数，符号支持 `string` 容错解析（`sh600519` / `600519` / `00700` / `AAPL` 均可）
- 一键运行，查看符合 v2 数据契约的返回结构（统一 `Quote` 联合、最小计价单位、`timestamp: number | null`）

> 状态：待 v2 SDK 实现完成后接通。届时本页会替换为真正的交互组件，无需改动链接。

## 先从这里开始

在 Playground 上线前，可以照着文档里的可读示例自己跑：

- [快速开始](/guide/getting-started) —— 10 行命名空间 demo,带你跑通第一个调用
- [安装](/guide/installation) —— npm / yarn / pnpm、subpath 导入(`stock-sdk/indicators`、`/signals`、`/symbols`)
- [API 总览](/api/) —— 命名空间地图与每个方法的签名、参数、返回说明
- [符号与代码规则](/guide/symbols) —— `string` 与 `SymbolRef`、`normalizeSymbol` 容错解析

文档中的每个代码块都是可直接复制运行的命名空间写法,Playground 接通后只是把它们搬进浏览器、配上即时运行而已。
