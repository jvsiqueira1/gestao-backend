const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { LRUCache } = require('lru-cache');

const router = express.Router();

const incomeCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
const expenseCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
const dashboardCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });

// Função auxiliar para montar data no formato YYYY-MM-DDT00:00:00
function makeLocalDate(year, month, day) {
  // month: 1-based (1=Jan)
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return new Date(`${year}-${mm}-${dd}T00:00:00`);
}

// Função auxiliar para parsear string de data (YYYY-MM-DD)
function parseDateString(dateStr) {
  if (!dateStr) return null;
  

  
  // Se já é um objeto Date, extrair componentes
  if (dateStr instanceof Date) {
    return {
      year: dateStr.getFullYear(),
      month: dateStr.getMonth() + 1, // getMonth() retorna 0-11
      day: dateStr.getDate()
    };
  }
  
  // Se é string, tentar parsear
  if (typeof dateStr === 'string') {
    // Remover espaços em branco
    const cleanDateStr = dateStr.trim();
    
    // Verificar se é formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
      const [year, month, day] = cleanDateStr.split('-').map(Number);
      
          // Validar se os valores são números válidos
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    
    // Validar se os valores estão em ranges válidos
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
      
      return { year, month, day };
    }
    
    // Tentar parsear como Date se não for formato YYYY-MM-DD
    const dateObj = new Date(cleanDateStr);
    if (!isNaN(dateObj.getTime())) {
      return {
        year: dateObj.getFullYear(),
        month: dateObj.getMonth() + 1,
        day: dateObj.getDate()
      };
    }
    
    return null;
  }
  
  return null;
}

// Listar rendas
router.get('/income', authMiddleware, async (req, res) => {
  const { month, year, fixed } = req.query;
  const cacheKey = `income:${req.user.id}:${month || ''}:${year || ''}:${fixed || ''}`;
  const cached = incomeCache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    const where = {
      user_id: req.user.id
    };

    if (fixed === '1') {
      where.isFixed = true;
    }

    let startDate, endDate;
    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 1);
      where.date = {
        gte: startDate,
        lt: endDate
      };
    }

    // Buscar receitas normais do período
    const incomes = await prisma.income.findMany({
      where,
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Buscar receitas fixas do usuário
    const fixedIncomes = await prisma.income.findMany({
      where: {
        user_id: req.user.id,
        isFixed: true,
        startDate: { lte: endDate || new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: startDate || new Date() } }
        ]
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Verificar se já existe lançamento real para o período
    const existingIncomeKeys = new Set(incomes.map(i => `${i.description}|${i.category_id}`));
    const generatedFixedIncomes = (fixedIncomes || []).map(fixed => {
      // Gerar data do lançamento fixo para o mês/ano consultado
      let shouldAppear = false;
      if (month && year) {
        const recurMonth = parseInt(month);
        const recurYear = parseInt(year);
        const start = fixed.startDate ? new Date(fixed.startDate) : null;
        const end = fixed.endDate ? new Date(fixed.endDate) : null;
        const inRange = (!start || (recurYear > start.getFullYear() || (recurYear === start.getFullYear() && recurMonth >= start.getMonth() + 1))) && (!end || (recurYear < end.getFullYear() || (recurYear === end.getFullYear() && recurMonth <= end.getMonth() + 1)));
        if (inRange) {
          if (fixed.recurrenceType === 'monthly') shouldAppear = true;
          if (fixed.recurrenceType === 'yearly' && start && recurMonth === start.getMonth() + 1) shouldAppear = true;
        }
      }
      if (!shouldAppear) return null;
      // Se já existe lançamento real igual (por descrição e categoria), não gerar duplicado
      const key = `${fixed.description}|${fixed.category_id}`;
      if (existingIncomeKeys.has(key)) return null;
      // Gerar objeto para o mês consultado
      return {
        ...fixed,
        date: startDate ? new Date(startDate) : new Date(),
        pending: true,
        category_name: fixed.category?.name || null
      };
    }).filter(Boolean);

    // --- AJUSTE PARA REGISTRO DE PENDENTES COM VÍNCULO ---
    // No GET /income
    const existingFixedIncomeIds = new Set(incomes.map(i => i.fixed_income_id).filter(Boolean));
    // Para receitas pendentes:
    const generatedFixedIncomesWithLink = (fixedIncomes || []).map(fixed => {
      let shouldAppear = false;
      let day = 1;
      if (fixed.startDate) {
        day = new Date(fixed.startDate).getDate();
      }
      if (month && year) {
        const recurMonth = parseInt(month);
        const recurYear = parseInt(year);
        const start = fixed.startDate ? new Date(fixed.startDate) : null;
        const end = fixed.endDate ? new Date(fixed.endDate) : null;
        const inRange = (!start || (recurYear > start.getFullYear() || (recurYear === start.getFullYear() && recurMonth >= start.getMonth() + 1))) && (!end || (recurYear < end.getFullYear() || (recurYear === end.getFullYear() && recurMonth <= end.getMonth() + 1)));
        if (inRange) {
          if (fixed.recurrenceType === 'monthly') shouldAppear = true;
          if (fixed.recurrenceType === 'yearly' && start && recurMonth === start.getMonth() + 1) shouldAppear = true;
        }
      }
      if (!shouldAppear) return null;
      if (existingFixedIncomeIds.has(fixed.id)) return null;
      const alreadyHasReal = incomes.some(i => i.isFixed && i.id === fixed.id && i.date && new Date(i.date).getFullYear() === parseInt(year) && new Date(i.date).getMonth() + 1 === parseInt(month));
      if (alreadyHasReal) return null;
      // Gerar data correta do pendente
      const date = (month && year) ? makeLocalDate(parseInt(year), parseInt(month), day) : (fixed.startDate ? new Date(fixed.startDate) : new Date());
      return {
        ...fixed,
        id: `pending-${fixed.id}-${month}-${year}`,
        date,
        pending: true,
        category_name: fixed.category?.name || null
      };
    }).filter(Boolean);

    // Transformar dados para manter compatibilidade
    const formattedIncomes = incomes.map(income => ({
      ...income,
      category_name: income.category?.name || null,
      pending: false
    }));

    const allIncomes = [...formattedIncomes, ...generatedFixedIncomesWithLink];
    incomeCache.set(cacheKey, allIncomes);
    res.json(allIncomes);
  } catch (err) {
    console.error('Erro ao buscar rendas:', err);
    res.status(500).json({ error: 'Erro ao buscar rendas.' });
  }
});

// Listar despesas
router.get('/expense', authMiddleware, async (req, res) => {
  const { month, year, fixed } = req.query;
  const cacheKey = `expense:${req.user.id}:${month || ''}:${year || ''}:${fixed || ''}`;
  const cached = expenseCache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    const where = {
      user_id: req.user.id
    };

    if (fixed === '1') {
      where.isFixed = true;
    }

    // Adicionar filtros de data se fornecidos
    let startDate, endDate;
    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 1);
      where.date = {
        gte: startDate,
        lt: endDate
      };
    }

    // Buscar despesas normais do período
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Buscar despesas fixas do usuário
    const fixedExpenses = await prisma.expense.findMany({
      where: {
        user_id: req.user.id,
        isFixed: true,
        startDate: { lte: endDate || new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: startDate || new Date() } }
        ]
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // --- AJUSTE FINAL: Somente lógica de fixed_expense_id para pendentes ---
    const existingFixedExpenseIds = new Set(expenses.map(i => i.fixed_expense_id).filter(Boolean));
    // Para despesas pendentes:
    const generatedFixedExpensesWithLink = (fixedExpenses || []).map(fixed => {
      let shouldAppear = false;
      let day = 1;
      if (fixed.startDate) {
        day = new Date(fixed.startDate).getDate();
      }
      if (month && year) {
        const recurMonth = parseInt(month);
        const recurYear = parseInt(year);
        const start = fixed.startDate ? new Date(fixed.startDate) : null;
        const end = fixed.endDate ? new Date(fixed.endDate) : null;
        const inRange = (!start || (recurYear > start.getFullYear() || (recurYear === start.getFullYear() && recurMonth >= start.getMonth() + 1))) && (!end || (recurYear < end.getFullYear() || (recurYear === end.getFullYear() && recurMonth <= end.getMonth() + 1)));
        if (inRange) {
          if (fixed.recurrenceType === 'monthly') shouldAppear = true;
          if (fixed.recurrenceType === 'yearly' && start && recurMonth === start.getMonth() + 1) shouldAppear = true;
        }
      }
      if (!shouldAppear) return null;
      if (existingFixedExpenseIds.has(fixed.id)) return null;
      const alreadyHasReal = expenses.some(i => i.isFixed && i.id === fixed.id && i.date && new Date(i.date).getFullYear() === parseInt(year) && new Date(i.date).getMonth() + 1 === parseInt(month));
      if (alreadyHasReal) return null;
      // Gerar data correta do pendente
      const date = (month && year) ? makeLocalDate(parseInt(year), parseInt(month), day) : (fixed.startDate ? new Date(fixed.startDate) : new Date());
      return {
        ...fixed,
        id: `pending-${fixed.id}-${month}-${year}`,
        date,
        pending: true,
        category_name: fixed.category?.name || null
      };
    }).filter(Boolean);

    // Transformar dados para manter compatibilidade
    const formattedExpenses = expenses.map(expense => ({
      ...expense,
      category_name: expense.category?.name || null,
      pending: false
    }));

    const allExpenses = [...formattedExpenses, ...generatedFixedExpensesWithLink];
    expenseCache.set(cacheKey, allExpenses);
    res.json(allExpenses);
  } catch (err) {
    console.error('Erro ao buscar despesas:', err);
    res.status(500).json({ error: 'Erro ao buscar despesas.' });
  }
});

// Dashboard: resumo mensal
router.get('/dashboard', authMiddleware, async (req, res) => {
  const { month, year } = req.query;
  const cacheKey = `dashboard:${req.user.id}:${month || ''}:${year || ''}`;
  const cached = dashboardCache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    // Se não foram fornecidos mês e ano, usar o mês/ano atual
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();
    
    const startDate = new Date(parseInt(currentYear), parseInt(currentMonth) - 1, 1);
    const endDate = new Date(parseInt(currentYear), parseInt(currentMonth), 1);

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { created_at: true }
    });

    // Buscar dados do mês atual
    const [incomeResult, expenseResult] = await Promise.all([
      prisma.income.aggregate({
        where: {
          user_id: req.user.id,
          date: {
            gte: startDate,
            lt: endDate
          }
        },
        _sum: {
          value: true
        }
      }),
      prisma.expense.aggregate({
        where: {
          user_id: req.user.id,
          date: {
            gte: startDate,
            lt: endDate
          }
        },
        _sum: {
          value: true
        }
      })
    ]);

    // Buscar dados mensais do ano selecionado
    const yearStart = new Date(parseInt(currentYear), 0, 1);
    const yearEnd = new Date(parseInt(currentYear) + 1, 0, 1);

    const monthlyData = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        SUM(CASE WHEN "table" = 'income' THEN value ELSE 0 END) as income,
        SUM(CASE WHEN "table" = 'expense' THEN value ELSE 0 END) as expense
      FROM (
        SELECT date, value, 'income' as "table" FROM income WHERE user_id = ${req.user.id} AND date >= ${yearStart} AND date < ${yearEnd}
        UNION ALL
        SELECT date, value, 'expense' as "table" FROM expense WHERE user_id = ${req.user.id} AND date >= ${yearStart} AND date < ${yearEnd}
      ) combined_data
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `;

    // Buscar dados de categorias para o mês selecionado
    const categoryData = await prisma.expense.groupBy({
      by: ['category_id'],
      where: {
        user_id: req.user.id,
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      _sum: {
        value: true
      },
      having: {
        category_id: {
          not: null
        }
      }
    });

    // Buscar nomes das categorias
    const categoryIds = categoryData.map(cat => cat.category_id).filter(Boolean);
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Processar dados de categoria
    const formattedCategoryData = categoryData
      .map(cat => {
        const category = categories.find(c => c.id === cat.category_id);
        return {
          name: category?.name || 'Sem categoria',
          value: cat._sum.value || 0
        };
      })
      .sort((a, b) => b.value - a.value);

    // Processar dados mensais
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    const processedMonthlyData = [];
    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyData.find(row => parseInt(row.month) === i);
      processedMonthlyData.push({
        month: monthNames[i - 1],
        income: monthData ? parseFloat(monthData.income) : 0,
        expense: monthData ? parseFloat(monthData.expense) : 0
      });
    }

    const monthlyIncome = incomeResult._sum.value || 0;
    const monthlyExpense = expenseResult._sum.value || 0;
    const saldo = monthlyIncome - monthlyExpense;

    const responseData = {
      monthlyIncome: Number(monthlyIncome),
      monthlyExpense: Number(monthlyExpense),
      saldo,
      monthlyData: processedMonthlyData,
      categoryData: formattedCategoryData,
      userCreatedAt: user.created_at,
      userCreatedYear: user.created_at.getFullYear(),
      userCreatedMonth: user.created_at.getMonth() + 1,
      currentMonth: parseInt(currentMonth),
      currentYear: parseInt(currentYear)
    };
    dashboardCache.set(cacheKey, responseData);
    res.json(responseData);
  } catch (err) {
    console.error('Erro ao buscar dados do dashboard:', err);
    res.status(500).json({ error: 'Erro ao buscar resumo do dashboard.' });
  }
});

// Criar renda
router.post('/income', authMiddleware, async (req, res) => {
  let { description, value, date, category_id, isFixed, recurrenceType, startDate, endDate, fixed_income_id } = req.body;
  const isFixedBool = isFixed === true || isFixed === 'true' || isFixed === 1 || isFixed === '1';



  // Validação básica
  if (!value || !date) {
    return res.status(400).json({ error: 'Valor e data são obrigatórios.' });
  }

  try {


    const parsedDate = parseDateString(date);
    const parsedStartDate = parseDateString(startDate);
    const parsedEndDate = parseDateString(endDate);

    // Validar se a data principal foi parseada corretamente
    if (!parsedDate) {
      return res.status(400).json({ 
        error: 'Data inválida. Formato esperado: YYYY-MM-DD',
        receivedDate: date,
        dateType: typeof date
      });
    }

    // Validar se a categoria existe (se fornecida)
    if (category_id) {
      const categoryExists = await prisma.category.findFirst({
        where: {
          id: parseInt(category_id),
          user_id: req.user.id
        }
      });
      if (!categoryExists) {
        return res.status(400).json({ error: 'Categoria não encontrada.' });
      }
    }

    const income = await prisma.income.create({
      data: {
        description,
        value: parseFloat(value),
        date: makeLocalDate(parsedDate.year, parsedDate.month, parsedDate.day),
        user_id: req.user.id,
        category_id: category_id ? parseInt(category_id) : null,
        isFixed: isFixedBool,
        recurrenceType: isFixedBool ? recurrenceType : null,
        startDate: isFixedBool ? (parsedStartDate ? makeLocalDate(parsedStartDate.year, parsedStartDate.month, parsedStartDate.day) : null) : null,
        endDate: isFixedBool ? (parsedEndDate ? makeLocalDate(parsedEndDate.year, parsedEndDate.month, parsedEndDate.day) : null) : null,
        fixed_income_id: fixed_income_id ? parseInt(fixed_income_id) : null
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Não criar mais lançamento inicial automaticamente
    // O histórico agora sempre inclui o lançamento inicial baseado no startDate

    incomeCache.clear();
    res.status(201).json(income);
  } catch (err) {
    console.error('Erro ao criar receita:', err);
    console.error('Dados que causaram erro:', {
      description,
      value,
      date,
      category_id,
      isFixed: isFixedBool,
      recurrenceType,
      startDate,
      endDate,
      fixed_income_id
    });
    res.status(500).json({ error: 'Erro ao criar receita.' });
  }
});

// Criar despesa
router.post('/expense', authMiddleware, async (req, res) => {
  let { description, value, date, category_id, isFixed, recurrenceType, startDate, endDate, fixed_expense_id } = req.body;
  const isFixedBool = isFixed === true || isFixed === 'true' || isFixed === 1 || isFixed === '1';



  // Validação básica
  if (!value || !date) {
    return res.status(400).json({ error: 'Valor e data são obrigatórios.' });
  }

  try {


    const parsedDate = parseDateString(date);
    const parsedStartDate = parseDateString(startDate);
    const parsedEndDate = parseDateString(endDate);

    // Validar se a data principal foi parseada corretamente
    if (!parsedDate) {
      return res.status(400).json({ 
        error: 'Data inválida. Formato esperado: YYYY-MM-DD',
        receivedDate: date,
        dateType: typeof date
      });
    }

    // Validar se a categoria existe (se fornecida)
    if (category_id) {
      const categoryExists = await prisma.category.findFirst({
        where: {
          id: parseInt(category_id),
          user_id: req.user.id
        }
      });
      if (!categoryExists) {
        return res.status(400).json({ error: 'Categoria não encontrada.' });
      }
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        value: parseFloat(value),
        date: makeLocalDate(parsedDate.year, parsedDate.month, parsedDate.day),
        user_id: req.user.id,
        category_id: category_id ? parseInt(category_id) : null,
        isFixed: isFixedBool,
        recurrenceType: isFixedBool ? recurrenceType : null,
        startDate: isFixedBool ? (parsedStartDate ? makeLocalDate(parsedStartDate.year, parsedStartDate.month, parsedStartDate.day) : null) : null,
        endDate: isFixedBool ? (parsedEndDate ? makeLocalDate(parsedEndDate.year, parsedEndDate.month, parsedEndDate.day) : null) : null,
        fixed_expense_id: fixed_expense_id ? parseInt(fixed_expense_id) : null
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Não criar mais lançamento inicial automaticamente
    // O histórico agora sempre inclui o lançamento inicial baseado no startDate

    expenseCache.clear();
    res.status(201).json(expense);
  } catch (err) {
    console.error('Erro ao criar despesa:', err);
    console.error('Dados que causaram erro:', {
      description,
      value,
      date,
      category_id,
      isFixed: isFixedBool,
      recurrenceType,
      startDate,
      endDate,
      fixed_expense_id
    });
    res.status(500).json({ error: 'Erro ao criar despesa.' });
  }
});

// Editar renda
router.put('/income/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { description, value, date, category_id } = req.body;
  
  try {
    const income = await prisma.income.update({
      where: {
        id: parseInt(id),
        user_id: req.user.id
      },
      data: {
        description,
        value: parseFloat(value),
        date: new Date(date),
        category_id: category_id ? parseInt(category_id) : null
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    // Transformar dados para manter compatibilidade
    const formattedIncome = {
      ...income,
      category_name: income.category?.name || null
    };

    incomeCache.clear();
    res.json(formattedIncome);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Renda não encontrada.' });
    }
    console.error('Erro ao editar renda:', err);
    res.status(500).json({ error: 'Erro ao editar renda.' });
  }
});

// Editar despesa
router.put('/expense/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { description, value, date, category_id } = req.body;
  
  try {
    const expense = await prisma.expense.update({
      where: {
        id: parseInt(id),
        user_id: req.user.id
      },
      data: {
        description,
        value: parseFloat(value),
        date: new Date(date),
        category_id: category_id ? parseInt(category_id) : null
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    // Transformar dados para manter compatibilidade
    const formattedExpense = {
      ...expense,
      category_name: expense.category?.name || null
    };

    expenseCache.clear();
    res.json(formattedExpense);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }
    console.error('Erro ao editar despesa:', err);
    res.status(500).json({ error: 'Erro ao editar despesa.' });
  }
});

// Excluir renda
router.delete('/income/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.income.delete({
      where: {
        id: parseInt(id),
        user_id: req.user.id
      }
    });

    incomeCache.clear();
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Renda não encontrada.' });
    }
    console.error('Erro ao excluir renda:', err);
    res.status(500).json({ error: 'Erro ao excluir renda.' });
  }
});

// Excluir despesa
router.delete('/expense/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.expense.delete({
      where: {
        id: parseInt(id),
        user_id: req.user.id
      }
    });

    expenseCache.clear();
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }
    console.error('Erro ao excluir despesa:', err);
    res.status(500).json({ error: 'Erro ao excluir despesa.' });
  }
});

// GET /income/:id/history
router.get('/income/:id/history', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const fixed = await prisma.income.findUnique({ where: { id: parseInt(id) } });
    if (!fixed || !fixed.isFixed) {
      return res.json([]);
    }

    // Data de início da recorrência
    const startDate = fixed.startDate ? new Date(fixed.startDate) : null;
    const startYear = startDate ? startDate.getFullYear() : null;
    const startMonth = startDate ? startDate.getMonth() + 1 : null;

    // Buscar o lançamento inicial (se existir)
    let initialEntry = null;
    if (startDate) {
      initialEntry = await prisma.income.findFirst({
        where: {
          user_id: req.user.id,
          isFixed: false,
          fixed_income_id: fixed.id,
          date: {
            gte: new Date(startDate.getFullYear(), startDate.getMonth(), 1),
            lt: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
          }
        }
      });
    }

    // Buscar outros lançamentos vinculados, exceto o mês do início
    const linkedRegistros = await prisma.income.findMany({
      where: {
        user_id: req.user.id,
        isFixed: false,
        fixed_income_id: fixed.id,
        ...(startDate && {
          OR: [
            { date: { lt: new Date(startDate.getFullYear(), startDate.getMonth(), 1) } },
            { date: { gte: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1) } }
          ]
        })
      },
      orderBy: { date: 'asc' }
    });

    // Buscar similares (mesma descrição, valor e categoria, não vinculados), exceto o mês do início
    const similarRegistros = await prisma.income.findMany({
      where: {
        user_id: req.user.id,
        isFixed: false,
        description: fixed.description,
        category_id: fixed.category_id,
        value: fixed.value,
        fixed_income_id: null,
        ...(startDate && {
          OR: [
            { date: { lt: new Date(startDate.getFullYear(), startDate.getMonth(), 1) } },
            { date: { gte: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1) } }
          ]
        })
      },
      orderBy: { date: 'asc' }
    });

    // Montar lista final
    let allRegistros = [];
    
    // Sempre incluir o mês inicial (se existir startDate)
    if (startDate) {
      allRegistros.push({
        id: 'initial',
        description: fixed.description,
        value: fixed.value,
        date: startDate,
        category: fixed.category_id ? await prisma.category.findUnique({ where: { id: fixed.category_id } }) : null,
        isInitial: true
      });
    }
    
    // Adicionar lançamentos reais
    if (initialEntry) allRegistros.push(initialEntry);
    allRegistros = [...allRegistros, ...linkedRegistros, ...similarRegistros];
    
    // Remover duplicatas baseado na data formatada
    const uniqueRegistros = allRegistros.filter((item, index, self) => {
      const itemDate = new Date(item.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return index === self.findIndex(t => {
        const tDate = new Date(t.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return tDate === itemDate;
      });
    });
    
    // Ordenar por data
    uniqueRegistros.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Remover campo isInitial do objeto final
    const result = uniqueRegistros.map(r => {
      const { isInitial, ...rest } = r;
      return rest;
    });
    res.json(result);
  } catch (error) {
    console.error('Erro no histórico de receitas:', error);
    res.json([]);
  }
});

// GET /expense/:id/history
router.get('/expense/:id/history', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const fixed = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!fixed || !fixed.isFixed) {
      return res.json([]);
    }

    // Data de início da recorrência
    const startDate = fixed.startDate ? new Date(fixed.startDate) : null;
    const startYear = startDate ? startDate.getFullYear() : null;
    const startMonth = startDate ? startDate.getMonth() + 1 : null;

    // Buscar o lançamento inicial (se existir)
    let initialEntry = null;
    if (startDate) {
      initialEntry = await prisma.expense.findFirst({
        where: {
          user_id: req.user.id,
          isFixed: false,
          fixed_expense_id: fixed.id,
          date: {
            gte: new Date(startDate.getFullYear(), startDate.getMonth(), 1),
            lt: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
          }
        }
      });
    }

    // Buscar outros lançamentos vinculados, exceto o mês do início
    const linkedRegistros = await prisma.expense.findMany({
      where: {
        user_id: req.user.id,
        isFixed: false,
        fixed_expense_id: fixed.id,
        ...(startDate && {
          OR: [
            { date: { lt: new Date(startDate.getFullYear(), startDate.getMonth(), 1) } },
            { date: { gte: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1) } }
          ]
        })
      },
      orderBy: { date: 'asc' }
    });

    // Buscar similares (mesma descrição, valor e categoria, não vinculados), exceto o mês do início
    const similarRegistros = await prisma.expense.findMany({
      where: {
        user_id: req.user.id,
        isFixed: false,
        description: fixed.description,
        category_id: fixed.category_id,
        value: fixed.value,
        fixed_expense_id: null,
        ...(startDate && {
          OR: [
            { date: { lt: new Date(startDate.getFullYear(), startDate.getMonth(), 1) } },
            { date: { gte: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1) } }
          ]
        })
      },
      orderBy: { date: 'asc' }
    });

    // Montar lista final
    let allRegistros = [];
    
    // Sempre incluir o mês inicial (se existir startDate)
    if (startDate) {
      allRegistros.push({
        id: 'initial',
        description: fixed.description,
        value: fixed.value,
        date: startDate,
        category: fixed.category_id ? await prisma.category.findUnique({ where: { id: fixed.category_id } }) : null,
        isInitial: true
      });
    }
    
    // Adicionar lançamentos reais
    if (initialEntry) allRegistros.push(initialEntry);
    allRegistros = [...allRegistros, ...linkedRegistros, ...similarRegistros];
    
    // Remover duplicatas baseado na data formatada
    const uniqueRegistros = allRegistros.filter((item, index, self) => {
      const itemDate = new Date(item.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return index === self.findIndex(t => {
        const tDate = new Date(t.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return tDate === itemDate;
      });
    });
    
    // Ordenar por data
    uniqueRegistros.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Remover campo isInitial do objeto final
    const result = uniqueRegistros.map(r => {
      const { isInitial, ...rest } = r;
      return rest;
    });
    res.json(result);
  } catch (error) {
    console.error('Erro no histórico de despesas:', error);
    res.json([]);
  }
});

module.exports = router; 