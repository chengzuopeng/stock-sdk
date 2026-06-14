/// <reference types="vite/client" />

// 声明 stock-sdk-local 模块（开发模式下指向本地 src）
// 这个模块在 Vite 配置中被别名到 ../../src
declare module 'stock-sdk-local' {
  // 使用 any 类型，因为这是运行时解析的别名
  export const StockSDK: any
  export default StockSDK
}
