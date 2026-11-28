import { describe, it, expect } from 'vitest';
import {
  negotiateProtocolVersion,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from '../../../src/mcp/protocol';

describe('mcp/protocol · negotiateProtocolVersion', () => {
  it('命中支持版本时原样回显', () => {
    for (const v of SUPPORTED_PROTOCOL_VERSIONS) {
      expect(negotiateProtocolVersion(v)).toBe(v);
    }
  });

  it('未知 / 缺失 / 非字符串版本回退到最新 stable', () => {
    expect(negotiateProtocolVersion('1999-01-01')).toBe(LATEST_PROTOCOL_VERSION);
    expect(negotiateProtocolVersion(undefined)).toBe(LATEST_PROTOCOL_VERSION);
    expect(negotiateProtocolVersion(123)).toBe(LATEST_PROTOCOL_VERSION);
    expect(negotiateProtocolVersion(null)).toBe(LATEST_PROTOCOL_VERSION);
  });

  it('最新版本为支持列表首项', () => {
    expect(LATEST_PROTOCOL_VERSION).toBe(SUPPORTED_PROTOCOL_VERSIONS[0]);
    expect(LATEST_PROTOCOL_VERSION).toBe('2025-11-25');
  });
});
