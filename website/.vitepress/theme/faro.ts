import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

/**
 * 初始化 Grafana Faro 监控
 * 仅在生产环境的浏览器中执行
 */
export function initFaro(): void {
  if (typeof window === 'undefined') {
    return
  }

  // 仅在生产环境上报（VitePress build 时 import.meta.env.PROD 为 true）
  if (!import.meta.env.PROD) {
    return
  }

  initializeFaro({
    url: 'https://faro-collector-prod-ap-southeast-1.grafana.net/collect/082decbf2646ea846e92dec8654b44ac',
    app: {
      name: 'stock-sdk-docs',
      version: '1.0.0',
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
