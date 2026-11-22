/**
 * 错误类型 subpath 入口（v2 A3）：`import { SdkError } from 'stock-sdk/errors'`
 */
export {
  SdkError,
  HttpError,
  UpstreamEmptyError,
  UpstreamError,
  AbortedError,
  NotFoundError,
  InvalidArgumentError,
  InvalidSymbolError,
  getSdkErrorCode,
  isSdkError,
  normalizeRequestError,
  attachErrorMetadata,
  type SdkErrorCode,
  type RequestError,
} from '../core/errors';
