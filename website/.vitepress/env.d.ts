/// <reference types="vite/client" />

// 声明 v1 文档站固定使用的 CDN SDK 入口。
declare module 'https://unpkg.com/stock-sdk@1.10.1/dist/index.js' {
  export const StockSDK: any
  export default StockSDK
}
