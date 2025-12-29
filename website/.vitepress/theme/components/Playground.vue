<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useData } from 'vitepress'
import { Icon } from '@iconify/vue'
import { codeToHtml } from 'shiki'

// 获取 VitePress 的主题状态
const { isDark } = useData()

// 高亮后的代码 HTML
const highlightedCode = ref('')

// 异步高亮代码
async function updateHighlightedCode(code: string) {
  try {
    // 始终使用深色主题，因为代码框背景是深色的
    highlightedCode.value = await codeToHtml(code, {
      lang: 'typescript',
      theme: 'github-dark',
    })
  } catch {
    // 如果高亮失败，显示纯文本
    highlightedCode.value = `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
  }
}

// 方法配置
interface ParamConfig {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  default: string
  required: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
}

interface MethodConfig {
  name: string
  desc: string
  category: string
  params: ParamConfig[]
  code: string
}

// 获取默认日期范围（近30天）
function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)

  const format = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  return { startDate: format(start), endDate: format(end) }
}

const defaultDates = getDefaultDateRange()

// 方法分类
const categories = [
  { key: 'quotes', label: '实时行情', icon: 'lucide:bar-chart-3', color: '#3b82f6' },
  { key: 'kline', label: 'K线数据', icon: 'lucide:line-chart', color: '#22c55e' },
  { key: 'board', label: '板块数据', icon: 'lucide:layout-grid', color: '#06b6d4' },
  { key: 'indicator', label: '技术指标', icon: 'lucide:trending-up', color: '#f59e0b' },
  { key: 'batch', label: '批量查询', icon: 'lucide:layers', color: '#8b5cf6' },
  { key: 'extended', label: '扩展功能', icon: 'lucide:zap', color: '#ef4444' },
]

const methodsConfig: Record<string, MethodConfig> = {
  getFullQuotes: {
    name: 'getFullQuotes',
    desc: '获取 A 股/指数全量行情',
    category: 'quotes',
    params: [
      { key: 'codes', label: '股票代码', type: 'text', default: 'sz000858,sh600519', required: true, placeholder: '多个用逗号分隔，如 sz000858,sh600519' }
    ],
    code: `const quotes = await sdk.getFullQuotes(['sz000858', 'sh600519']);
// 返回: FullQuote[]
console.log(quotes[0].name);   // 五 粮 液
console.log(quotes[0].price);  // 111.70`
  },
  getSimpleQuotes: {
    name: 'getSimpleQuotes',
    desc: '获取简要行情',
    category: 'quotes',
    params: [
      { key: 'codes', label: '股票代码', type: 'text', default: 'sz000858,sh000001', required: true, placeholder: '多个用逗号分隔' }
    ],
    code: `const quotes = await sdk.getSimpleQuotes(['sz000858', 'sh000001']);
// 返回: SimpleQuote[]
console.log(quotes[0].name);  // 五 粮 液`
  },
  getHKQuotes: {
    name: 'getHKQuotes',
    desc: '获取港股行情',
    category: 'quotes',
    params: [
      { key: 'codes', label: '港股代码', type: 'text', default: '09988,00700', required: true, placeholder: '如 09988, 00700' }
    ],
    code: `const quotes = await sdk.getHKQuotes(['09988']);
// 返回: HKQuote[]
console.log(quotes[0].name);  // 阿里巴巴-W`
  },
  getUSQuotes: {
    name: 'getUSQuotes',
    desc: '获取美股行情',
    category: 'quotes',
    params: [
      { key: 'codes', label: '美股代码', type: 'text', default: 'AAPL,MSFT,BABA', required: true, placeholder: '如 BABA, AAPL' }
    ],
    code: `const quotes = await sdk.getUSQuotes(['BABA']);
// 返回: USQuote[]
console.log(quotes[0].code);  // BABA.N`
  },
  getFundQuotes: {
    name: 'getFundQuotes',
    desc: '获取公募基金行情',
    category: 'quotes',
    params: [
      { key: 'codes', label: '基金代码', type: 'text', default: '000001,110011', required: true, placeholder: '如 000001, 110011' }
    ],
    code: `const funds = await sdk.getFundQuotes(['000001']);
// 返回: FundQuote[]
console.log(funds[0].name);  // 华夏成长混合
console.log(funds[0].nav);   // 最新净值`
  },
  getHistoryKline: {
    name: 'getHistoryKline',
    desc: '获取 A 股历史 K 线',
    category: 'kline',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: 'sz000001', required: true, placeholder: '如 sz000001' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', required: false, options: [{ value: 'daily', label: '日线' }, { value: 'weekly', label: '周线' }, { value: 'monthly', label: '月线' }] },
      { key: 'adjust', label: '复权类型', type: 'select', default: 'hfq', required: false, options: [{ value: '', label: '不复权' }, { value: 'qfq', label: '前复权' }, { value: 'hfq', label: '后复权' }] },
      { key: 'startDate', label: '开始日期', type: 'text', default: defaultDates.startDate, required: false, placeholder: 'YYYYMMDD' },
      { key: 'endDate', label: '结束日期', type: 'text', default: defaultDates.endDate, required: false, placeholder: 'YYYYMMDD' }
    ],
    code: `const klines = await sdk.getHistoryKline('sz000001', {
  period: 'daily',
  adjust: 'hfq',
  startDate: '20240101',
  endDate: '20241231'
});
console.log(klines[0].date);   // '2024-12-17'
console.log(klines[0].close);  // 收盘价`
  },
  getHKHistoryKline: {
    name: 'getHKHistoryKline',
    desc: '获取港股历史 K 线',
    category: 'kline',
    params: [
      { key: 'symbol', label: '港股代码', type: 'text', default: '00700', required: true, placeholder: '如 00700' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', required: false, options: [{ value: 'daily', label: '日线' }, { value: 'weekly', label: '周线' }, { value: 'monthly', label: '月线' }] },
      { key: 'adjust', label: '复权类型', type: 'select', default: 'hfq', required: false, options: [{ value: '', label: '不复权' }, { value: 'qfq', label: '前复权' }, { value: 'hfq', label: '后复权' }] },
      { key: 'startDate', label: '开始日期', type: 'text', default: defaultDates.startDate, required: false, placeholder: 'YYYYMMDD' },
      { key: 'endDate', label: '结束日期', type: 'text', default: defaultDates.endDate, required: false, placeholder: 'YYYYMMDD' }
    ],
    code: `const klines = await sdk.getHKHistoryKline('00700');
console.log(klines[0].name);   // '腾讯控股'
console.log(klines[0].close);  // 收盘价`
  },
  getUSHistoryKline: {
    name: 'getUSHistoryKline',
    desc: '获取美股历史 K 线',
    category: 'kline',
    params: [
      { key: 'symbol', label: '美股代码', type: 'text', default: '105.MSFT', required: true, placeholder: '如 105.MSFT' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', required: false, options: [{ value: 'daily', label: '日线' }, { value: 'weekly', label: '周线' }, { value: 'monthly', label: '月线' }] },
      { key: 'adjust', label: '复权类型', type: 'select', default: 'hfq', required: false, options: [{ value: '', label: '不复权' }, { value: 'qfq', label: '前复权' }, { value: 'hfq', label: '后复权' }] },
      { key: 'startDate', label: '开始日期', type: 'text', default: defaultDates.startDate, required: false, placeholder: 'YYYYMMDD' },
      { key: 'endDate', label: '结束日期', type: 'text', default: defaultDates.endDate, required: false, placeholder: 'YYYYMMDD' }
    ],
    code: `// 市场代码: 105(纳斯达克), 106(纽交所)
const klines = await sdk.getUSHistoryKline('105.MSFT');
console.log(klines[0].name);   // '微软'
console.log(klines[0].close);  // 收盘价`
  },
  getMinuteKline: {
    name: 'getMinuteKline',
    desc: '获取分钟 K 线/分时',
    category: 'kline',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: 'sz000001', required: true, placeholder: '如 sz000001' },
      { key: 'period', label: 'K线周期', type: 'select', default: '5', required: false, options: [{ value: '1', label: '1分钟(分时)' }, { value: '5', label: '5分钟' }, { value: '15', label: '15分钟' }, { value: '30', label: '30分钟' }, { value: '60', label: '60分钟' }] },
      { key: 'adjust', label: '复权类型', type: 'select', default: 'hfq', required: false, options: [{ value: '', label: '不复权' }, { value: 'qfq', label: '前复权' }, { value: 'hfq', label: '后复权' }] }
    ],
    code: `// 获取 5 分钟 K 线
const klines = await sdk.getMinuteKline('sz000001', {
  period: '5',
  adjust: 'hfq'
});
console.log(klines[0].time);  // '2024-12-17 09:35'`
  },
  getTodayTimeline: {
    name: 'getTodayTimeline',
    desc: '获取当日分时走势',
    category: 'kline',
    params: [
      { key: 'code', label: '股票代码', type: 'text', default: 'sz000001', required: true, placeholder: '如 sz000001' }
    ],
    code: `const timeline = await sdk.getTodayTimeline('sz000001');
console.log(timeline.date);         // '20241217'
console.log(timeline.data.length);  // 240
console.log(timeline.data[0].price);     // 成交价
console.log(timeline.data[0].avgPrice);  // 均价`
  },
  // 行业板块
  getIndustryList: {
    name: 'getIndustryList',
    desc: '获取行业板块列表',
    category: 'board',
    params: [],
    code: `const boards = await sdk.getIndustryList();
// 返回: IndustryBoard[]
console.log(boards[0].name);  // 板块名称
console.log(boards[0].code);  // BK1027`
  },
  getIndustrySpot: {
    name: 'getIndustrySpot',
    desc: '获取行业板块实时行情',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '互联网服务', required: true, placeholder: '如 互联网服务 或 BK0447' }
    ],
    code: `const spot = await sdk.getIndustrySpot('互联网服务');
// 返回: IndustryBoardSpot[]
console.log(spot[0].item);   // 指标名称
console.log(spot[0].value);  // 指标值`
  },
  getIndustryConstituents: {
    name: 'getIndustryConstituents',
    desc: '获取行业板块成分股',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '互联网服务', required: true, placeholder: '如 互联网服务 或 BK0447' }
    ],
    code: `const stocks = await sdk.getIndustryConstituents('互联网服务');
// 返回: IndustryBoardConstituent[]
console.log(stocks[0].name);  // 股票名称
console.log(stocks[0].code);  // 股票代码`
  },
  getIndustryKline: {
    name: 'getIndustryKline',
    desc: '获取行业板块 K 线',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '互联网服务', required: true, placeholder: '如 互联网服务 或 BK0447' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', required: false, options: [{ value: 'daily', label: '日线' }, { value: 'weekly', label: '周线' }, { value: 'monthly', label: '月线' }] },
      { key: 'startDate', label: '开始日期', type: 'text', default: defaultDates.startDate, required: false, placeholder: 'YYYYMMDD' },
      { key: 'endDate', label: '结束日期', type: 'text', default: defaultDates.endDate, required: false, placeholder: 'YYYYMMDD' }
    ],
    code: `const klines = await sdk.getIndustryKline('互联网服务', {
  period: 'daily',
  startDate: '20240101'
});
console.log(klines[0].date);   // 日期
console.log(klines[0].close);  // 收盘价`
  },
  // 概念板块
  getConceptList: {
    name: 'getConceptList',
    desc: '获取概念板块列表',
    category: 'board',
    params: [],
    code: `const boards = await sdk.getConceptList();
// 返回: ConceptBoard[]
console.log(boards[0].name);  // 板块名称
console.log(boards[0].code);  // BK0800`
  },
  getConceptSpot: {
    name: 'getConceptSpot',
    desc: '获取概念板块实时行情',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '人工智能', required: true, placeholder: '如 人工智能 或 BK0800' }
    ],
    code: `const spot = await sdk.getConceptSpot('人工智能');
// 返回: ConceptBoardSpot[]
console.log(spot[0].item);   // 指标名称
console.log(spot[0].value);  // 指标值`
  },
  getConceptConstituents: {
    name: 'getConceptConstituents',
    desc: '获取概念板块成分股',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '人工智能', required: true, placeholder: '如 人工智能 或 BK0800' }
    ],
    code: `const stocks = await sdk.getConceptConstituents('人工智能');
// 返回: ConceptBoardConstituent[]
console.log(stocks[0].name);  // 股票名称
console.log(stocks[0].code);  // 股票代码`
  },
  getConceptKline: {
    name: 'getConceptKline',
    desc: '获取概念板块 K 线',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '人工智能', required: true, placeholder: '如 人工智能 或 BK0800' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', required: false, options: [{ value: 'daily', label: '日线' }, { value: 'weekly', label: '周线' }, { value: 'monthly', label: '月线' }] },
      { key: 'startDate', label: '开始日期', type: 'text', default: defaultDates.startDate, required: false, placeholder: 'YYYYMMDD' },
      { key: 'endDate', label: '结束日期', type: 'text', default: defaultDates.endDate, required: false, placeholder: 'YYYYMMDD' }
    ],
    code: `const klines = await sdk.getConceptKline('人工智能', {
  period: 'daily',
  startDate: '20240101'
});
console.log(klines[0].date);   // 日期
console.log(klines[0].close);  // 收盘价`
  },
  getKlineWithIndicators: {
    name: 'getKlineWithIndicators',
    desc: '获取带技术指标的 K 线',
    category: 'indicator',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: 'sz000001', required: true, placeholder: '支持 A股/港股/美股' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', required: false, options: [{ value: 'daily', label: '日线' }, { value: 'weekly', label: '周线' }, { value: 'monthly', label: '月线' }] },
      { key: 'adjust', label: '复权类型', type: 'select', default: 'hfq', required: false, options: [{ value: '', label: '不复权' }, { value: 'qfq', label: '前复权' }, { value: 'hfq', label: '后复权' }] },
      { key: 'startDate', label: '开始日期', type: 'text', default: defaultDates.startDate, required: false, placeholder: 'YYYYMMDD' },
      { key: 'endDate', label: '结束日期', type: 'text', default: defaultDates.endDate, required: false, placeholder: 'YYYYMMDD' },
      { key: 'indicators', label: '技术指标', type: 'text', default: 'ma,macd,boll,kdj', required: false, placeholder: 'ma,macd,boll,kdj,rsi,wr' }
    ],
    code: `const data = await sdk.getKlineWithIndicators('sz000001', {
  indicators: {
    ma: { periods: [5, 10, 20] },
    macd: true,
    boll: true,
    kdj: true
  }
});
console.log(data[0].ma?.ma5);       // MA5
console.log(data[0].macd?.dif);     // MACD DIF
console.log(data[0].boll?.upper);   // 布林上轨
console.log(data[0].kdj?.k);        // KDJ K值`
  },
  getAShareCodeList: {
    name: 'getAShareCodeList',
    desc: '获取全部 A 股代码',
    category: 'batch',
    params: [
      { key: 'includeExchange', label: '包含交易所前缀', type: 'select', default: 'true', required: false, options: [{ value: 'true', label: '是' }, { value: 'false', label: '否' }] }
    ],
    code: `const codes = await sdk.getAShareCodeList();
console.log(codes.length);  // 5000+
console.log(codes[0]);      // 'bj920000'`
  },
  getHKCodeList: {
    name: 'getHKCodeList',
    desc: '获取全部港股代码',
    category: 'batch',
    params: [],
    code: `const codes = await sdk.getHKCodeList();
console.log(codes[0]);  // '00700'`
  },
  getUSCodeList: {
    name: 'getUSCodeList',
    desc: '获取全部美股代码',
    category: 'batch',
    params: [
      { key: 'includeMarket', label: '包含市场前缀', type: 'select', default: 'true', required: false, options: [{ value: 'true', label: '是' }, { value: 'false', label: '否' }] }
    ],
    code: `const codes = await sdk.getUSCodeList();
console.log(codes[0]);  // '105.MSFT'`
  },
  getAllAShareQuotes: {
    name: 'getAllAShareQuotes',
    desc: '获取全市场 A 股行情',
    category: 'batch',
    params: [
      { key: 'batchSize', label: '批量大小', type: 'number', default: '500', required: false, placeholder: '默认 500' },
      { key: 'concurrency', label: '并发数', type: 'number', default: '7', required: false, placeholder: '默认 7' }
    ],
    code: `const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 500,
  concurrency: 7,
  onProgress: (completed, total) => {
    console.log(\`进度: \${completed}/\${total}\`);
  }
});
console.log(\`共获取 \${allQuotes.length} 只股票\`);`
  },
  getFundFlow: {
    name: 'getFundFlow',
    desc: '获取资金流向',
    category: 'extended',
    params: [
      { key: 'codes', label: '股票代码', type: 'text', default: 'sz000858', required: true, placeholder: '多个用逗号分隔' }
    ],
    code: `const flows = await sdk.getFundFlow(['sz000858']);
console.log(flows[0].mainNet);       // 主力净流入
console.log(flows[0].mainNetRatio);  // 主力净流入占比`
  },
  getPanelLargeOrder: {
    name: 'getPanelLargeOrder',
    desc: '获取盘口大单占比',
    category: 'extended',
    params: [
      { key: 'codes', label: '股票代码', type: 'text', default: 'sz000858', required: true, placeholder: '多个用逗号分隔' }
    ],
    code: `const orders = await sdk.getPanelLargeOrder(['sz000858']);
console.log(orders[0].buyLargeRatio);   // 买盘大单占比
console.log(orders[0].sellLargeRatio);  // 卖盘大单占比`
  },
  getTradingCalendar: {
    name: 'getTradingCalendar',
    desc: '获取 A 股交易日历',
    category: 'extended',
    params: [],
    code: `const calendar = await sdk.getTradingCalendar();
console.log(calendar.length);        // 交易日总数
console.log(calendar[0]);            // '1990-12-19' (第一个交易日)
console.log(calendar.slice(-5));     // 最近 5 个交易日`
  },
}

// 按分类分组方法
const methodsByCategory = computed(() => {
  const grouped: Record<string, string[]> = {}
  for (const [key, config] of Object.entries(methodsConfig)) {
    if (!grouped[config.category]) {
      grouped[config.category] = []
    }
    grouped[config.category].push(key)
  }
  return grouped
})

// 状态
const currentMethod = ref('getFullQuotes')
const paramValues = ref<Record<string, string>>({})
const isLoading = ref(false)
const result = ref('')
const resultStatus = ref<'idle' | 'success' | 'error'>('idle')
const duration = ref(0)
const resultCount = ref(0)
const showCode = ref(false)
const sdk = ref<any>(null)
const sdkLoaded = ref(false)

// 当前方法配置
const currentConfig = computed(() => methodsConfig[currentMethod.value])

// 初始化参数
function initParams() {
  const config = currentConfig.value
  const values: Record<string, string> = {}
  config.params.forEach(param => {
    values[param.key] = param.default
  })
  paramValues.value = values
}

// 切换方法
function selectMethod(method: string) {
  currentMethod.value = method
  initParams()
  resultStatus.value = 'idle'
  result.value = ''
  showCode.value = false
}

// 发送请求
async function fetchData() {
  if (!sdk.value) {
    result.value = '错误: SDK 未加载，请确保网络连接正常后刷新页面'
    resultStatus.value = 'error'
    return
  }

  isLoading.value = true
  resultStatus.value = 'idle'
  result.value = '加载中...'

  const startTime = performance.now()

  try {
    let data: any
    const params = paramValues.value

    switch (currentMethod.value) {
      case 'getFullQuotes': {
        const codes = params.codes.split(',').map(c => c.trim()).filter(Boolean)
        data = await sdk.value.getFullQuotes(codes)
        break
      }
      case 'getSimpleQuotes': {
        const codes = params.codes.split(',').map(c => c.trim()).filter(Boolean)
        data = await sdk.value.getSimpleQuotes(codes)
        break
      }
      case 'getAShareCodeList': {
        data = await sdk.value.getAShareCodeList(params.includeExchange === 'true')
        break
      }
      case 'getUSCodeList': {
        data = await sdk.value.getUSCodeList(params.includeMarket === 'true')
        break
      }
      case 'getHKCodeList': {
        data = await sdk.value.getHKCodeList()
        break
      }
      case 'getAllAShareQuotes': {
        data = await sdk.value.getAllAShareQuotes({
          batchSize: parseInt(params.batchSize) || 500,
          concurrency: parseInt(params.concurrency) || 7,
          onProgress: (completed: number, total: number) => {
            result.value = `加载中... ${completed}/${total} 批次`
          }
        })
        break
      }
      case 'getFundFlow': {
        const codes = params.codes.split(',').map(c => c.trim()).filter(Boolean)
        data = await sdk.value.getFundFlow(codes)
        break
      }
      case 'getPanelLargeOrder': {
        const codes = params.codes.split(',').map(c => c.trim()).filter(Boolean)
        data = await sdk.value.getPanelLargeOrder(codes)
        break
      }
      case 'getTradingCalendar': {
        data = await sdk.value.getTradingCalendar()
        break
      }
      case 'getHKQuotes': {
        const codes = params.codes.split(',').map(c => c.trim()).filter(Boolean)
        data = await sdk.value.getHKQuotes(codes)
        break
      }
      case 'getUSQuotes': {
        const codes = params.codes.split(',').map(c => c.trim()).filter(Boolean)
        data = await sdk.value.getUSQuotes(codes)
        break
      }
      case 'getFundQuotes': {
        const codes = params.codes.split(',').map(c => c.trim()).filter(Boolean)
        data = await sdk.value.getFundQuotes(codes)
        break
      }
      case 'getHistoryKline': {
        const options: any = { period: params.period, adjust: params.adjust }
        if (params.startDate) options.startDate = params.startDate
        if (params.endDate) options.endDate = params.endDate
        data = await sdk.value.getHistoryKline(params.symbol, options)
        break
      }
      case 'getHKHistoryKline': {
        const options: any = { period: params.period, adjust: params.adjust }
        if (params.startDate) options.startDate = params.startDate
        if (params.endDate) options.endDate = params.endDate
        data = await sdk.value.getHKHistoryKline(params.symbol, options)
        break
      }
      case 'getUSHistoryKline': {
        const options: any = { period: params.period, adjust: params.adjust }
        if (params.startDate) options.startDate = params.startDate
        if (params.endDate) options.endDate = params.endDate
        data = await sdk.value.getUSHistoryKline(params.symbol, options)
        break
      }
      case 'getMinuteKline': {
        data = await sdk.value.getMinuteKline(params.symbol, {
          period: params.period,
          adjust: params.adjust
        })
        break
      }
      case 'getTodayTimeline': {
        data = await sdk.value.getTodayTimeline(params.code)
        break
      }
      case 'getKlineWithIndicators': {
        const options: any = { period: params.period, adjust: params.adjust }
        if (params.startDate) options.startDate = params.startDate
        if (params.endDate) options.endDate = params.endDate
        const indicatorList = params.indicators ? params.indicators.split(',').map(s => s.trim()).filter(Boolean) : []
        options.indicators = {}
        indicatorList.forEach(ind => {
          if (ind === 'ma') options.indicators.ma = { periods: [5, 10, 20, 60] }
          else if (ind === 'macd') options.indicators.macd = true
          else if (ind === 'boll') options.indicators.boll = true
          else if (ind === 'kdj') options.indicators.kdj = true
          else if (ind === 'rsi') options.indicators.rsi = { periods: [6, 12, 24] }
          else if (ind === 'wr') options.indicators.wr = true
          else if (ind === 'bias') options.indicators.bias = { periods: [6, 12, 24] }
          else if (ind === 'cci') options.indicators.cci = true
          else if (ind === 'atr') options.indicators.atr = true
        })
        data = await sdk.value.getKlineWithIndicators(params.symbol, options)
        break
      }
      // 行业板块
      case 'getIndustryList': {
        data = await sdk.value.getIndustryList()
        break
      }
      case 'getIndustrySpot': {
        data = await sdk.value.getIndustrySpot(params.symbol)
        break
      }
      case 'getIndustryConstituents': {
        data = await sdk.value.getIndustryConstituents(params.symbol)
        break
      }
      case 'getIndustryKline': {
        const options: any = { period: params.period }
        if (params.startDate) options.startDate = params.startDate
        if (params.endDate) options.endDate = params.endDate
        data = await sdk.value.getIndustryKline(params.symbol, options)
        break
      }
      // 概念板块
      case 'getConceptList': {
        data = await sdk.value.getConceptList()
        break
      }
      case 'getConceptSpot': {
        data = await sdk.value.getConceptSpot(params.symbol)
        break
      }
      case 'getConceptConstituents': {
        data = await sdk.value.getConceptConstituents(params.symbol)
        break
      }
      case 'getConceptKline': {
        const options: any = { period: params.period }
        if (params.startDate) options.startDate = params.startDate
        if (params.endDate) options.endDate = params.endDate
        data = await sdk.value.getConceptKline(params.symbol, options)
        break
      }
      default:
        throw new Error('未知方法')
    }

    const endTime = performance.now()
    duration.value = Math.round(endTime - startTime)
    resultCount.value = Array.isArray(data) ? data.length : (data?.data?.length || 1)
    result.value = JSON.stringify(data, null, 2)
    resultStatus.value = 'success'
  } catch (error: any) {
    const endTime = performance.now()
    duration.value = Math.round(endTime - startTime)
    result.value = `错误: ${error.message}\n\n${error.stack || ''}`
    resultStatus.value = 'error'
  } finally {
    isLoading.value = false
  }
}

// 清空结果
function clearResult() {
  result.value = ''
  resultStatus.value = 'idle'
}

// 加载 SDK
async function loadSDK() {
  // 开发模式下使用本地源码，生产模式下使用 unpkg
  const isDev = import.meta.env.DEV
  
  if (isDev) {
    // 本地开发：直接引用 src 源码
    const module = await import('stock-sdk-local') as any
    const SDKClass = module.StockSDK || module.default
    return new SDKClass()
  } else {
    // 生产环境：从 unpkg 加载
    const module = await import('https://unpkg.com/stock-sdk/dist/index.js') as any
    return new module.StockSDK()
  }
}

onMounted(async () => {
  initParams()
  try {
    sdk.value = await loadSDK()
    sdkLoaded.value = true
    const isDev = import.meta.env.DEV
    console.log(`🚀 Stock SDK Playground 已加载 (${isDev ? '本地开发模式' : '生产模式'})`)
    console.log('💡 提示: 可以在控制台使用 window.sdk 直接调用 SDK 方法')
    ;(window as any).sdk = sdk.value
  } catch (error) {
    console.error('加载 SDK 失败:', error)
    result.value = '加载 SDK 失败，请检查网络连接或刷新页面重试'
    resultStatus.value = 'error'
  }
})

// 监听方法和代码显示状态的变化，更新代码高亮
watch([currentMethod, showCode], async () => {
  if (showCode.value && currentConfig.value) {
    const fullCode = `const sdk = new StockSDK();\n// ${currentConfig.value.desc}\n${currentConfig.value.code}`;
    await updateHighlightedCode(fullCode);
  }
}, { immediate: true })

watch(currentMethod, () => {
  initParams()
})
</script>

<template>
  <div class="playground" :class="{ dark: isDark }">
    <div class="playground-body">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span>API 方法</span>
          <div class="sdk-status">
            <span v-if="sdkLoaded" class="status-badge success" title="SDK 已就绪">
              <span class="dot"></span>
            </span>
            <span v-else class="status-badge loading" title="加载中...">
              <span class="spinner"></span>
            </span>
          </div>
        </div>
        <nav class="method-nav">
          <div v-for="cat in categories" :key="cat.key" class="category">
            <div class="category-header">
              <span class="category-icon" :style="{ color: cat.color }">
                <Icon :icon="cat.icon" />
              </span>
              <span class="category-label">{{ cat.label }}</span>
            </div>
            <div class="category-methods">
              <button
                v-for="method in methodsByCategory[cat.key]"
                :key="method"
                class="method-item"
                :class="{ active: currentMethod === method }"
                @click="selectMethod(method)"
              >
                {{ methodsConfig[method].name }}
              </button>
            </div>
          </div>
        </nav>
      </aside>

      <main class="main-content">
        <div class="card params-card">
          <div class="card-header">
            <div class="method-info">
              <h2>{{ currentConfig.name }}</h2>
              <span class="method-desc">{{ currentConfig.desc }}</span>
            </div>
            <button class="btn-toggle-code" :class="{ active: showCode }" @click="showCode = !showCode">
              {{ showCode ? '隐藏代码' : '查看示例' }}
            </button>
          </div>
          <div class="card-body">
            <div class="params-grid">
              <div v-for="param in currentConfig.params" :key="param.key" class="param-item">
                <label class="param-label">
                  {{ param.label }}
                  <span v-if="param.required" class="required">*</span>
                </label>
                <select
                  v-if="param.type === 'select'"
                  v-model="paramValues[param.key]"
                  class="param-input"
                >
                  <option v-for="opt in param.options" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <input
                  v-else
                  :type="param.type"
                  v-model="paramValues[param.key]"
                  :placeholder="param.placeholder"
                  class="param-input"
                />
              </div>
            </div>

            <Transition name="expand">
              <div v-if="showCode" class="code-example-section">
                <div class="shiki-wrapper" v-html="highlightedCode"></div>
              </div>
            </Transition>

            <div class="action-bar">
              <button class="btn primary" :disabled="isLoading || !sdkLoaded" @click="fetchData">
                <span v-if="isLoading" class="btn-spinner"></span>
                {{ isLoading ? '请求中...' : '🚀 发送请求' }}
              </button>
              <button class="btn secondary" @click="clearResult">清空</button>
            </div>
          </div>
        </div>

        <div class="card result-card">
          <div class="card-header">
            <h3>返回结果</h3>
            <div v-if="resultStatus !== 'idle'" class="result-meta">
              <span :class="['status-tag', resultStatus]">
                {{ resultStatus === 'success' ? '✓ 成功' : '✕ 失败' }}
              </span>
              <span class="meta-item">耗时: <strong>{{ duration }}ms</strong></span>
              <span v-if="resultStatus === 'success'" class="meta-item">
                数量: <strong>{{ resultCount }}</strong>
              </span>
            </div>
          </div>
          <div class="card-body">
            <div :class="['result-box', resultStatus]">
              <pre>{{ result || '点击「发送请求」按钮开始测试...' }}</pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.playground {
  /* 浅色主题变量 - 红色主题 */
  --pg-bg: #f8fafc;
  --pg-surface: #ffffff;
  --pg-surface-hover: #f1f5f9;
  --pg-border: #e2e8f0;
  --pg-text: #1e293b;
  --pg-text-secondary: #64748b;
  --pg-text-muted: #94a3b8;
  --pg-accent: #f87171;
  --pg-accent-hover: #ef4444;
  --pg-accent-soft: rgba(248, 113, 113, 0.1);
  --pg-success: #22c55e;
  --pg-error: #ef4444;
  --pg-code-bg: #1e293b;
  --pg-code-text: #e2e8f0;
  --pg-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --pg-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.1);

  /* 固定高度，填满可视区域，不产生外部滚动 */
  height: calc(100vh - 64px);
  overflow: hidden;
  background: var(--pg-bg);
  color: var(--pg-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 深色主题变量 */
.playground.dark {
  --pg-bg: #0f172a;
  --pg-surface: #1e293b;
  --pg-surface-hover: #334155;
  --pg-border: #334155;
  --pg-text: #f1f5f9;
  --pg-text-secondary: #94a3b8;
  --pg-text-muted: #64748b;
  --pg-accent: #fca5a5;
  --pg-accent-hover: #f87171;
  --pg-accent-soft: rgba(252, 165, 165, 0.15);
  --pg-code-bg: #0f172a;
  --pg-code-text: #e2e8f0;
  --pg-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  --pg-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.4);
}

/* Body Layout */
.playground-body {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--pg-surface);
  border-right: 1px solid var(--pg-border);
  flex-shrink: 0;
}

.sidebar-header {
  flex-shrink: 0;
}

.method-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pg-text-muted);
  border-bottom: 1px solid var(--pg-border);
}

.sdk-status {
  display: flex;
  align-items: center;
}

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.status-badge.success .dot {
  width: 8px;
  height: 8px;
  background: var(--pg-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-badge.loading .spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--pg-accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}


.category {
  margin-bottom: 16px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--pg-text-secondary);
}

.category-icon {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
}

.category-methods {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.method-item {
  display: block;
  width: 100%;
  padding: 10px 12px 10px 36px;
  text-align: left;
  font-size: 0.875rem;
  color: var(--pg-text);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.method-item:hover {
  background: var(--pg-surface-hover);
}

.method-item.active {
  background: var(--pg-accent-soft);
  color: var(--pg-accent);
  font-weight: 500;
}

/* Main Content */
.main-content {
  flex: 1;
  min-height: 0; /* 允许 flex 子元素收缩，启用滚动 */
  padding: 24px;
  overflow-y: auto;
  background: var(--pg-bg);
}

/* Cards */
.card {
  background: var(--pg-surface);
  border: 1px solid var(--pg-border);
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: var(--pg-shadow);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--pg-border);
}

.card-header h2, .card-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.method-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.method-desc {
  font-size: 0.875rem;
  color: var(--pg-text-secondary);
}

.btn-toggle-code {
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--pg-accent);
  background: var(--pg-accent-soft);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle-code:hover {
  background: var(--pg-accent);
  color: white;
}

.btn-toggle-code.active {
  background: var(--pg-accent);
  color: white;
}

.card-body {
  padding: 20px;
}

/* Params */
.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--pg-text-secondary);
}

.param-label .required {
  color: var(--pg-error);
  margin-left: 2px;
}

.param-input {
  padding: 10px 14px;
  font-size: 0.95rem;
  background: var(--pg-bg);
  border: 1px solid var(--pg-border);
  border-radius: 10px;
  color: var(--pg-text);
  transition: all 0.2s;
  outline: none;
}

.param-input:focus {
  border-color: var(--pg-accent);
  box-shadow: 0 0 0 3px var(--pg-accent-soft);
}

.param-input::placeholder {
  color: var(--pg-text-muted);
}

/* Code Example Section */
.code-example-section {
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  background: #1e293b;
}

.shiki-wrapper {
  font-size: 0.85rem;
  line-height: 1.6;
}

.shiki-wrapper :deep(pre) {
  margin: 0;
  padding: 16px 20px;
  border-radius: 12px;
  overflow-x: auto;
  background: #1e293b !important;
}

.shiki-wrapper :deep(code) {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
}

.dark .code-example-section {
  background: #0f172a;
}

.dark .shiki-wrapper :deep(pre) {
  background: #0f172a !important;
}

/* Expand Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Action Bar */
.action-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 0.95rem;
  font-weight: 500;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.primary {
  background: linear-gradient(135deg, #f87171 0%, #fb923c 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(248, 113, 113, 0.35);
}

.btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(248, 113, 113, 0.45);
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.secondary {
  background: var(--pg-surface-hover);
  color: var(--pg-text);
}

.btn.secondary:hover {
  background: var(--pg-border);
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Result Card */
.result-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-tag.success {
  background: rgba(34, 197, 94, 0.1);
  color: var(--pg-success);
}

.status-tag.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--pg-error);
}

.meta-item {
  font-size: 0.875rem;
  color: var(--pg-text-secondary);
}

.meta-item strong {
  color: var(--pg-accent);
}

.result-box {
  background: var(--pg-code-bg);
  border-radius: 12px;
  padding: 16px 20px;
  max-height: 500px;
  overflow: auto;
}

.result-box pre {
  margin: 0;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--pg-code-text);
  white-space: pre-wrap;
  word-break: break-all;
}

.result-box.success {
  border: 1px solid var(--pg-success);
}

.result-box.error {
  border: 1px solid var(--pg-error);
}

.result-box.error pre {
  color: var(--pg-error);
}

/* Responsive */
@media (max-width: 900px) {
  .playground {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .playground-body {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--pg-border);
  }

  .method-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    overflow-y: visible;
  }

  .main-content {
    height: auto;
    overflow-y: visible;
  }

  .category {
    flex: 1;
    min-width: 200px;
  }

  .params-grid {
    grid-template-columns: 1fr;
  }
}
</style>
