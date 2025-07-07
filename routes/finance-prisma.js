const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { LRUCache } = require('lru-cache');

const router = express.Router();

const incomeCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
const expenseCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
const dashboardCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });

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

    // Adicionar filtros de data se fornecidos
    if (month && year) {
      where.date = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lt: new Date(parseInt(year), parseInt(month), 1)
      };
    }

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

    // Transformar dados para manter compatibilidade
    const formattedIncomes = incomes.map(income => ({
      ...income,
      category_name: income.category?.name || null
    }));

    incomeCache.set(cacheKey, formattedIncomes);
    res.json(formattedIncomes);
  } catch (err) {
    console.error('Erro ao buscar rendas:', err);
    res.status(500).json({ error: 'Erro ao buscar rendas.' });
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

    // Adicionar filtros de data se fornecidos
    if (month && year) {
      where.date = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lt: new Date(parseInt(year), parseInt(month), 1)
      };
    }

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

    // Transformar dados para manter compatibilidade
    const formattedExpenses = expenses.map(expense => ({
      ...expense,
      category_name: expense.category?.name || null
    }));

    expenseCache.set(cacheKey, formattedExpenses);
    res.json(formattedExpenses);
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
  const { description, value, date, category_id } = req.body;
  
  try {
    const income = await prisma.income.create({
      data: {
        description,
        value: parseFloat(value),
        date: new Date(date),
        user_id: req.user.id,
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

    res.status(201).json(formattedIncome);
  } catch (err) {
    console.error('Erro ao criar renda:', err);
    res.status(500).json({ error: 'Erro ao criar renda.' });
  }
});

// Criar despesa
router.post('/expense', authMiddleware, async (req, res) => {
  const { description, value, date, category_id } = req.body;
  
  try {
    const expense = await prisma.expense.create({
      data: {
        description,
        value: parseFloat(value),
        date: new Date(date),
        user_id: req.user.id,
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

    res.status(201).json(formattedExpense);
  } catch (err) {
    console.error('Erro ao criar despesa:', err);
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

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }
    console.error('Erro ao excluir despesa:', err);
    res.status(500).json({ error: 'Erro ao excluir despesa.' });
  }
});

module.exports = router; 