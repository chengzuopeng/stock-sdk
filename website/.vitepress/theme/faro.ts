import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

/**
 * 初始化 Grafana Faro 监控（v2 文档站，独立 collect 通道）
 * 仅在生产环境的浏览器中执行
 *
 * @param version 站点版本号（由 enhanceApp 传入 themeConfig.sdkVersion，
 *   即 package.json 的真实版本），用于在 Grafana 按发版分桶；缺省传 'unknown'
 *   而非硬编码，避免版本随发版漂移。
 */
export function initFaro(version?: string): void {
  if (typeof window === 'undefined') {
    return
  }

  // 仅在生产环境上报（VitePress build 时 import.meta.env.PROD 为 true）
  if (!import.meta.env.PROD) {
    return
  }

  initializeFaro({
    url: 'https://faro-collector-prod-ap-southeast-1.grafana.net/collect/f0d3ef06cdba88b8e125fd0953b72157',
    app: {
      name: 'stock-sdk-docs-v2',
      version: version ?? 'unknown',
      environment: 'production',
    },

    instrumentations: [
      // Mandatory, omits default instrumentations otherwise.
      ...getWebInstrumentations(),

      // Tracing package to get end-to-end visibility for HTTP requests.
      new TracingInstrumentation(),
    ],
  })
}
