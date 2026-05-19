const prismaService = require('./prisma.service');
const { LRUCache } = require('lru-cache');
const { INVESTMENT_TYPES, TX_TYPES } = require('../utils/investment_types');

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

class InvestmentService {
  constructor() {
    this.prisma = prismaService.getClient();
    this.cache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
  }

  parseDate(input) {
    if (!input) return null;
    if (input instanceof Date) return input;
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
      const [y, m, d] = input.trim().split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  invalidate(userId) {
    for (const key of this.cache.keys()) {
      if (key.includes(`u:${userId}`)) this.cache.delete(key);
    }
  }

  validateType(type) {
    if (!INVESTMENT_TYPES.includes(type)) {
      throw Object.assign(new Error('Tipo de ativo inválido.'), { status: 400 });
    }
  }

  validateTxType(type) {
    if (!TX_TYPES.includes(type)) {
      throw Object.assign(new Error('Tipo de lançamento inválido.'), { status: 400 });
    }
  }

  async listInvestments(userId) {
    const cacheKey = `list:u:${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const investments = await this.prisma.investment.findMany({
      where: { user_id: userId },
      orderBy: [{ archived: 'asc' }, { created_at: 'desc' }],
      include: {
        transactions: true,
        valuations: { orderBy: { date: 'desc' }, take: 1 }
      }
    });

    const enriched = investments.map((inv) => {
      const aportes = inv.transactions.filter((t) => t.type === 'aporte');
      const resgates = inv.transactions.filter((t) => t.type === 'resgate');
      const proventos = inv.transactions.filter((t) => t.type === 'dividendo' || t.type === 'juros');
      const total_aportes = aportes.reduce((s, t) => s + t.value, 0);
      const total_resgates = resgates.reduce((s, t) => s + t.value, 0);
      const total_proventos = proventos.reduce((s, t) => s + t.value, 0);
      const aportes_liq = total_aportes - total_resgates;
      const quantity_total =
        aportes.reduce((s, t) => s + (t.quantity || 0), 0) -
        resgates.reduce((s, t) => s + (t.quantity || 0), 0);
      const lastVal = inv.valuations[0];
      const current_value = lastVal ? lastVal.value : aportes_liq;
      const current_value_date = lastVal ? lastVal.date : null;
      const rentabilidade = current_value - aportes_liq;
      const rentabilidade_pct = aportes_liq > 0 ? (rentabilidade / aportes_liq) * 100 : 0;

      return {
        id: inv.id,
        name: inv.name,
        ticker: inv.ticker,
        type: inv.type,
        broker: inv.broker,
        notes: inv.notes,
        archived: inv.archived,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
        total_aportes,
        total_resgates,
        total_proventos,
        aportes_liq,
        quantity_total,
        current_value,
        current_value_date,
        rentabilidade,
        rentabilidade_pct
      };
    });

    this.cache.set(cacheKey, enriched);
    return enriched;
  }

  async getInvestment(userId, id) {
    const inv = await this.prisma.investment.findFirst({
      where: { id: parseInt(id), user_id: userId },
      include: {
        transactions: { orderBy: { date: 'desc' } },
        valuations: { orderBy: { date: 'desc' } }
      }
    });
    if (!inv) {
      throw Object.assign(new Error('Investimento não encontrado.'), { status: 404 });
    }
    return inv;
  }

  async createInvestment(userId, data) {
    const { name, ticker, type, broker, notes } = data;
    if (!name || !type) {
      throw Object.assign(new Error('Nome e tipo são obrigatórios.'), { status: 400 });
    }
    this.validateType(type);
    const inv = await this.prisma.investment.create({
      data: {
        user_id: userId,
        name,
        ticker: ticker || null,
        type,
        broker: broker || null,
        notes: notes || null
      }
    });
    this.invalidate(userId);
    return inv;
  }

  async updateInvestment(userId, id, data) {
    const existing = await this.prisma.investment.findFirst({
      where: { id: parseInt(id), user_id: userId }
    });
    if (!existing) {
      throw Object.assign(new Error('Investimento não encontrado.'), { status: 404 });
    }
    if (data.type) this.validateType(data.type);
    const inv = await this.prisma.investment.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name ?? existing.name,
        ticker: data.ticker === undefined ? existing.ticker : data.ticker || null,
        type: data.type ?? existing.type,
        broker: data.broker === undefined ? existing.broker : data.broker || null,
        notes: data.notes === undefined ? existing.notes : data.notes || null,
        archived: data.archived === undefined ? existing.archived : !!data.archived
      }
    });
    this.invalidate(userId);
    return inv;
  }

  async deleteInvestment(userId, id) {
    const existing = await this.prisma.investment.findFirst({
      where: { id: parseInt(id), user_id: userId }
    });
    if (!existing) {
      throw Object.assign(new Error('Investimento não encontrado.'), { status: 404 });
    }
    await this.prisma.investment.delete({ where: { id: parseInt(id) } });
    this.invalidate(userId);
    return { success: true };
  }

  async addTransaction(userId, investmentId, data) {
    const inv = await this.prisma.investment.findFirst({
      where: { id: parseInt(investmentId), user_id: userId }
    });
    if (!inv) {
      throw Object.assign(new Error('Investimento não encontrado.'), { status: 404 });
    }
    this.validateTxType(data.type);
    const date = this.parseDate(data.date) || new Date();
    const value = parseFloat(data.value);
    if (isNaN(value) || value <= 0) {
      throw Object.assign(new Error('Valor inválido.'), { status: 400 });
    }
    const tx = await this.prisma.investmentTransaction.create({
      data: {
        investment_id: inv.id,
        user_id: userId,
        type: data.type,
        value,
        quantity: data.quantity != null ? parseFloat(data.quantity) : null,
        date,
        notes: data.notes || null
      }
    });
    this.invalidate(userId);
    return tx;
  }

  async deleteTransaction(userId, txId) {
    const tx = await this.prisma.investmentTransaction.findFirst({
      where: { id: parseInt(txId), user_id: userId }
    });
    if (!tx) {
      throw Object.assign(new Error('Lançamento não encontrado.'), { status: 404 });
    }
    await this.prisma.investmentTransaction.delete({ where: { id: tx.id } });
    this.invalidate(userId);
    return { success: true };
  }

  async addValuation(userId, investmentId, data) {
    const inv = await this.prisma.investment.findFirst({
      where: { id: parseInt(investmentId), user_id: userId }
    });
    if (!inv) {
      throw Object.assign(new Error('Investimento não encontrado.'), { status: 404 });
    }
    const value = parseFloat(data.value);
    if (isNaN(value) || value < 0) {
      throw Object.assign(new Error('Valor inválido.'), { status: 400 });
    }
    const date = this.parseDate(data.date) || new Date();
    const v = await this.prisma.valuation.create({
      data: { investment_id: inv.id, user_id: userId, value, date }
    });
    this.invalidate(userId);
    return v;
  }

  async listAllTransactions(userId, { month, year } = {}) {
    const where = { user_id: userId };
    if (month && year) {
      const startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      const endDate = new Date(Date.UTC(parseInt(year), parseInt(month), 1));
      where.date = { gte: startDate, lt: endDate };
    }
    return this.prisma.investmentTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { investment: { select: { name: true, ticker: true, type: true } } }
    });
  }

  async getSummary(userId, month, year) {
    const cacheKey = `summary:u:${userId}:${month || ''}:${year || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const investments = await this.listInvestments(userId);
    const active = investments.filter((i) => !i.archived);

    const totalPatrimony = active.reduce((s, i) => s + (i.current_value || 0), 0);
    const totalAportado = active.reduce((s, i) => s + i.aportes_liq, 0);
    const totalProventos = active.reduce((s, i) => s + i.total_proventos, 0);
    const totalRentabilidade = totalPatrimony - totalAportado;
    const rentabilidadePct = totalAportado > 0 ? (totalRentabilidade / totalAportado) * 100 : 0;

    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(currentYear, currentMonth, 1));

    const monthTx = await this.prisma.investmentTransaction.findMany({
      where: { user_id: userId, date: { gte: monthStart, lt: monthEnd } }
    });
    const monthlyAportes = monthTx.filter((t) => t.type === 'aporte').reduce((s, t) => s + t.value, 0);
    const monthlyResgates = monthTx.filter((t) => t.type === 'resgate').reduce((s, t) => s + t.value, 0);
    const monthlyProventos = monthTx
      .filter((t) => t.type === 'dividendo' || t.type === 'juros')
      .reduce((s, t) => s + t.value, 0);

    const byType = {};
    for (const i of active) {
      if (!byType[i.type]) byType[i.type] = 0;
      byType[i.type] += i.current_value || 0;
    }
    const allocationByType = Object.entries(byType)
      .map(([type, value]) => ({
        type,
        value,
        pct: totalPatrimony > 0 ? (value / totalPatrimony) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    // Evolução últimos 12 meses
    const evolution = [];
    const allValuations = await this.prisma.valuation.findMany({
      where: { user_id: userId },
      orderBy: { date: 'asc' }
    });
    const allInvestments = await this.prisma.investment.findMany({
      where: { user_id: userId, archived: false },
      select: { id: true }
    });
    const activeIds = new Set(allInvestments.map((i) => i.id));

    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(currentYear, currentMonth - 1 - i + 1, 1));
      // d = first day of next month → valuations strictly < d are within this month
      const monthLabel = MONTH_NAMES[(d.getUTCMonth() + 11) % 12];
      let total = 0;
      for (const id of activeIds) {
        const last = [...allValuations].reverse().find((v) => v.investment_id === id && v.date < d);
        if (last) total += last.value;
      }
      evolution.push({ month: monthLabel, value: total });
    }

    const result = {
      totalPatrimony,
      totalAportado,
      totalProventos,
      totalRentabilidade,
      rentabilidadePct,
      monthlyAportes,
      monthlyResgates,
      monthlyProventos,
      activeCount: active.length,
      archivedCount: investments.length - active.length,
      allocationByType,
      evolution
    };

    this.cache.set(cacheKey, result);
    return result;
  }
}

module.exports = new InvestmentService();
