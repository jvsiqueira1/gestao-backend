const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { LRUCache } = require('lru-cache');

const router = express.Router();

const incomeCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
const expenseCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
const dashboardCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });

// Função utilitária para invalidar todas as chaves de cache de um usuário
function invalidateUserCache(cache, prefix, userId) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${prefix}:${userId}`)) {
      cache.delete(key);
    }
  }
}

// Adicionar renda
router.post('/income', authMiddleware, async (req, res) => {
  const { value, description, date, category_id } = req.body;
  
  if (!value || !date) {
    return res.status(400).json({ error: 'Valor e data são obrigatórios.' });
  }
  
  try {
    const income = await prisma.income.create({
      data: {
        user_id: req.user.id,
        value: parseFloat(value),
        description: description || '',
        date: new Date(date),
        category_id: category_id ? parseInt(category_id) : null
      },
      include: {
        category: true
      }
    });
    
    invalidateUserCache(incomeCache, 'income', req.user.id);
    invalidateUserCache(dashboardCache, 'dashboard', req.user.id);
    res.status(201).json(income);
  } catch (err) {
    console.error("Erro detalhado ao criar receita: ", err);
    res.status(500).json({ error: 'Erro ao adicionar renda.' });
  }
});

// Listar rendas
router.get('/income', authMiddleware, async (req, res) => {
  const { month, year } = req.query;
  const cacheKey = `income:${req.user.id}:${month || ''}:${year || ''}`;
  const cached = incomeCache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    const where = {
      user_id: req.user.id
    };
    
    if (month && year) {
      where.date = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lt: new Date(parseInt(year), parseInt(month), 1)
      };
    }
    
    const incomes = await prisma.income.findMany({
      where,
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    // Adicionar category_name para compatibilidade com frontend
    const incomesWithCategoryName = incomes.map(income => ({
      ...income,
      category_name: income.category?.name || null
    }));
    
    incomeCache.set(cacheKey, incomesWithCategoryName);
    res.json(incomesWithCategoryName);
  } catch (err) {
    console.error('Erro ao buscar rendas:', err);
    res.status(500).json({ error: 'Erro ao buscar rendas.' });
  }
});

// Adicionar despesa
router.post('/expense', authMiddleware, async (req, res) => {
  const { value, description, date, category_id } = req.body;
  
  if (!value || !date || !category_id) {
    return res.status(400).json({ error: 'Valor, data e categoria são obrigatórios.' });
  }
  
  try {
    const expense = await prisma.expense.create({
      data: {
        user_id: req.user.id,
        value: parseFloat(value),
        description: description || '',
        date: new Date(date),
        category_id: parseInt(category_id)
      },
      include: {
        category: true
      }
    });
    
    invalidateUserCache(expenseCache, 'expense', req.user.id);
    invalidateUserCache(dashboardCache, 'dashboard', req.user.id);
    res.status(201).json(expense);
  } catch (err) {
    console.error("Erro detalhado ao criar despesa: ", err);
    res.status(500).json({ error: 'Erro ao adicionar despesa.' });
  }
});

// Listar despesas
router.get('/expense', authMiddleware, async (req, res) => {
  const { month, year } = req.query;
  const cacheKey = `expense:${req.user.id}:${month || ''}:${year || ''}`;
  const cached = expenseCache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    const where = {
      user_id: req.user.id
    };
    
    if (month && year) {
      where.date = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lt: new Date(parseInt(year), parseInt(month), 1)
      };
    }
    
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    // Adicionar category_name para compatibilidade com frontend
    const expensesWithCategoryName = expenses.map(expense => ({
      ...expense,
      category_name: expense.category?.name || null
    }));
    
    expenseCache.set(cacheKey, expensesWithCategoryName);
    res.json(expensesWithCategoryName);
  } catch (err) {
    console.error('Erro ao buscar despesas:', err);
    res.status(500).json({ error: 'Erro ao buscar despesas.' });
  }
});

// Dashboard: resumo mensal (rendas, despesas, saldo)
router.get('/dashboard', authMiddleware, async (req, res) => {
  const { month, year } = req.query;
  const cacheKey = `dashboard:${req.user.id}:${month || ''}:${year || ''}`;
  const cached = dashboardCache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    // Buscar dados do usuário para obter a data de cadastro
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { created_at: true }
    });
    
    const userCreatedAt = user.created_at;
    const userCreatedYear = new Date(userCreatedAt).getFullYear();
    const userCreatedMonth = new Date(userCreatedAt).getMonth() + 1;
    
    // Se não foram fornecidos mês e ano, usar o mês/ano atual
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();
    
    const startDate = new Date(parseInt(currentYear), parseInt(currentMonth) - 1, 1);
    const endDate = new Date(parseInt(currentYear), parseInt(currentMonth), 1);
    
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
    
    const monthlyIncome = incomeResult._sum.value || 0;
    const monthlyExpense = expenseResult._sum.value || 0;
    
    // Buscar dados mensais do ano selecionado
    const yearStart = new Date(parseInt(currentYear), 0, 1);
    const yearEnd = new Date(parseInt(currentYear) + 1, 0, 1);
    
    const monthlyDataRaw = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        EXTRACT(YEAR FROM date) as year,
        SUM(CASE WHEN table_type = 'income' THEN value ELSE 0 END) as income,
        SUM(CASE WHEN table_type = 'expense' THEN value ELSE 0 END) as expense
      FROM (
        SELECT date, value, 'income' as table_type FROM income WHERE user_id = ${req.user.id} AND date >= ${yearStart} AND date < ${yearEnd}
        UNION ALL
        SELECT date, value, 'expense' as table_type FROM expense WHERE user_id = ${req.user.id} AND date >= ${yearStart} AND date < ${yearEnd}
      ) combined_data
      GROUP BY EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date)
      ORDER BY month
    `;
    
    // Buscar dados de categorias para o mês selecionado
    const categoryData = await prisma.category.findMany({
      where: {
        user_id: req.user.id,
        type: 'expense'
      },
      include: {
        expenses: {
          where: {
            date: {
              gte: startDate,
              lt: endDate
            }
          }
        }
      }
    });
    
    // Processar dados mensais
    const monthlyData = [];
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    // Criar array com todos os meses do ano
    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyDataRaw.find(row => parseInt(row.month) === i);
      monthlyData.push({
        month: monthNames[i - 1],
        income: monthData ? parseFloat(monthData.income) : 0,
        expense: monthData ? parseFloat(monthData.expense) : 0
      });
    }
    
    const saldo = monthlyIncome - monthlyExpense;
    
    // Processar dados de categorias
    const categoryDataProcessed = categoryData
      .map(category => ({
        name: category.name,
        value: category.expenses.reduce((sum, expense) => sum + expense.value, 0)
      }))
      .filter(category => category.value > 0)
      .sort((a, b) => b.value - a.value);
    
    const responseData = {
      monthlyIncome,
      monthlyExpense,
      saldo,
      monthlyData,
      categoryData: categoryDataProcessed,
      userCreatedAt,
      userCreatedYear,
      userCreatedMonth,
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

// Editar renda
router.put('/income/:id', authMiddleware, async (req, res) => {
  const { value, description, date, category_id } = req.body;
  const { id } = req.params;
  try {
    const income = await prisma.income.update({
      where: {
        id: parseInt(id),
        user_id: req.user.id
      },
      data: {
        value: parseFloat(value),
        description: description || '',
        date: new Date(date),
        category_id: category_id ? parseInt(category_id) : null
      },
      include: {
        category: true
      }
    });
    invalidateUserCache(incomeCache, 'income', req.user.id);
    invalidateUserCache(dashboardCache, 'dashboard', req.user.id);
    res.json(income);
  } catch (err) {
    console.error('Erro ao editar renda:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Renda não encontrada.' });
    }
    res.status(500).json({ error: 'Erro ao editar renda.' });
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
    invalidateUserCache(incomeCache, 'income', req.user.id);
    invalidateUserCache(dashboardCache, 'dashboard', req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir renda:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Renda não encontrada.' });
    }
    res.status(500).json({ error: 'Erro ao excluir renda.' });
  }
});

// Editar despesa
router.put('/expense/:id', authMiddleware, async (req, res) => {
  const { value, description, date, category_id } = req.body;
  const { id } = req.params;
  try {
    const expense = await prisma.expense.update({
      where: {
        id: parseInt(id),
        user_id: req.user.id
      },
      data: {
        value: parseFloat(value),
        description: description || '',
        date: new Date(date),
        category_id: parseInt(category_id)
      },
      include: {
        category: true
      }
    });
    invalidateUserCache(expenseCache, 'expense', req.user.id);
    invalidateUserCache(dashboardCache, 'dashboard', req.user.id);
    res.json(expense);
  } catch (err) {
    console.error('Erro ao editar despesa:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }
    res.status(500).json({ error: 'Erro ao editar despesa.' });
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
    invalidateUserCache(expenseCache, 'expense', req.user.id);
    invalidateUserCache(dashboardCache, 'dashboard', req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir despesa:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }
    res.status(500).json({ error: 'Erro ao excluir despesa.' });
  }
});

module.exports = router; 