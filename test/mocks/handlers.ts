import { http, HttpResponse } from 'msw';

const json = (body: unknown) => HttpResponse.json(body);
const text = (body: string) =>
  new HttpResponse(body, { headers: { 'Content-Type': 'text/plain' } });

export const handlers = [
  http.get('https://assets.linkdiary.cn/shares/zh_a_list.json', () =>
    json({ success: true, list: ['sz000001', 'sh600000', 'bj430047'] })
  ),
  http.get('https://assets.linkdiary.cn/shares/us_list.json', () =>
    json({ success: true, list: ['105.AAPL', '106.BABA'] })
  ),
  http.get('https://assets.linkdiary.cn/shares/hk_list.json', () =>
    json({ success: true, list: ['00700', '09988'] })
  ),
  http.get('https://assets.linkdiary.cn/shares/trade-data-list.txt', () =>
    text('1990-12-19,1990-12-20,2024-01-02')
  ),
];
