import type { RequestClient } from '../core';

export abstract class BaseService {
  constructor(protected readonly client: RequestClient) {}
}
