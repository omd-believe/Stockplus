import { request } from './apiClient';

/**
 * Endpoints module: The only place with URLs and field mapping.
 */

export const endpoints = {
  // Auth
  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request('/me'),

  // Stocks
  getStocks: () => request('/stocks'),

  getStock: (symbol) => request(`/stocks/${encodeURIComponent(symbol)}`),

  getStockHistory: (symbol, range = '1D') =>
    request(`/stocks/${encodeURIComponent(symbol)}/history?range=${range}`),

  getImpactPreview: (symbol, side, quantity) =>
    request(`/stocks/${encodeURIComponent(symbol)}/impact-preview?side=${side}&quantity=${Number(quantity)}`),

  // Market
  getMarketStatus: () => request('/market/status'),

  toggleDrift: (enabled) =>
    request('/admin/market/drift', {
      method: 'POST',
      body: JSON.stringify({ enabled: Boolean(enabled) }),
    }),

  // Portfolio
  getPortfolio: () => request('/portfolio'),

  getRisk: async () => {
    const data = await request('/portfolio/risk');
    return {
      riskLevel: data.riskLevel,
      diversificationScore: data.diversificationScore,
      sectorAllocation: data.sectorAllocation || {},
      largestHolding: {
        symbol: data.largestHoldingSymbol || null,
        pct: data.largestHoldingPct ?? 0,
      },
      warnings: (data.warnings || []).map((w) =>
        typeof w === 'string' ? { code: 'CONCENTRATION', message: w } : w
      ),
    };
  },

  buyStock: async (symbol, quantity) => {
    const data = await request('/portfolio/buy', {
      method: 'POST',
      body: JSON.stringify({ symbol, quantity: Number(quantity) }),
    });
    return {
      ...data,
      price: data.executionPrice ?? data.price,
      cashBalance: data.cashBalance ?? data.newCashBalance,
    };
  },

  sellStock: async (symbol, quantity) => {
    const data = await request('/portfolio/sell', {
      method: 'POST',
      body: JSON.stringify({ symbol, quantity: Number(quantity) }),
    });
    return {
      ...data,
      price: data.executionPrice ?? data.price,
      cashBalance: data.cashBalance ?? data.newCashBalance,
    };
  },

  // Transactions
  getTransactions: async (page = 0, size = 10, symbol = null) => {
    let url = `/transactions?page=${page}&size=${size}`;
    if (symbol) {
      url += `&symbol=${encodeURIComponent(symbol)}`;
    }
    const data = await request(url);
    return {
      content: data.content || [],
      page: data.number ?? data.page ?? 0,
      size: data.size ?? size,
      totalPages: data.totalPages ?? 0,
      totalElements: data.totalElements ?? 0,
    };
  },

  // Admin
  simulateTick: () =>
    request('/admin/stocks/simulate-tick', {
      method: 'POST',
    }),

  setStockPrice: (symbol, price) =>
    request(`/admin/stocks/${encodeURIComponent(symbol)}/price`, {
      method: 'POST',
      body: JSON.stringify({ price: Number(price) }),
    }),
};
