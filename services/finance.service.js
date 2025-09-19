const prismaService = require('./prisma.service');
const { LRUCache } = require('lru-cache');

class FinanceService {
  constructor() {
    this.prisma = prismaService.getClient();
    this.incomeCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
    this.expenseCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
    this.dashboardCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
  }

  // Função auxiliar para montar data no formato YYYY-MM-DDT00:00:00.000Z (UTC)
  makeLocalDate(year, month, day) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return new Date(`${year}-${mm}-${dd}T00:00:00.000Z`);
  }

  // Função auxiliar para parsear string de data (YYYY-MM-DD)
  parseDateString(dateStr) {
    if (!dateStr) return null;

    if (dateStr instanceof Date) {
      return {
        year: dateStr.getFullYear(),
        month: dateStr.getMonth() + 1,
        day: dateStr.getDate()
      };
    }

    if (typeof dateStr === 'string') {
      const cleanDateStr = dateStr.trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
        const [year, month, day] = cleanDateStr.split('-').map(Number);

        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return null;
        }

        if (
          year < 1900 ||
          year > 2100 ||
          month < 1 ||
          month > 12 ||
          day < 1 ||
          day > 31
        ) {
          return null;
        }

        return { year, month, day };
      }

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

  async getIncomes(userId, filters = {}) {
    const { month, year, fixed } = filters;
    const cacheKey = `income:${userId}:${month || ''}:${year || ''}:${fixed || ''}`;
    const cached = this.incomeCache.get(cacheKey);
    if (cached) return cached;

    try {
      const where = { user_id: userId };

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

      const incomes = await this.prisma.income.findMany({
        where,
        include: {
          category: {
            select: { name: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      const fixedIncomes = await this.prisma.income.findMany({
        where: {
          user_id: userId,
          isFixed: true,
          startDate: { lte: endDate || new Date() },
          OR: [{ endDate: null }, { endDate: { gte: startDate || new Date() } }]
        },
        include: {
          category: { select: { name: true } }
        }
      });

      const existingFixedIncomeIds = new Set(
        incomes.map(i => i.fixed_income_id).filter(Boolean)
      );

      const generatedFixedIncomesWithLink = (fixedIncomes || [])
        .map(fixed => {
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
            const inRange =
              (!start ||
                recurYear > start.getFullYear() ||
                (recurYear === start.getFullYear() &&
                  recurMonth >= start.getMonth() + 1)) &&
              (!end ||
                recurYear < end.getFullYear() ||
                (recurYear === end.getFullYear() &&
                  recurMonth <= end.getMonth() + 1));
            if (inRange) {
              if (fixed.recurrenceType === 'monthly') shouldAppear = true;
              if (
                fixed.recurrenceType === 'yearly' &&
                start &&
                recurMonth === start.getMonth() + 1
              )
                shouldAppear = true;
            }
          }
          if (!shouldAppear) return null;
          if (existingFixedIncomeIds.has(fixed.id)) return null;
          const alreadyHasReal = incomes.some(
            i =>
              i.isFixed &&
              i.id === fixed.id &&
              i.date &&
              new Date(i.date).getFullYear() === parseInt(year) &&
              new Date(i.date).getMonth() + 1 === parseInt(month)
          );
          if (alreadyHasReal) return null;

          const date =
            month && year
              ? this.makeLocalDate(parseInt(year), parseInt(month), day)
              : fixed.startDate
                ? new Date(fixed.startDate)
                : new Date();
          return {
            ...fixed,
            id: `pending-${fixed.id}-${month}-${year}`,
            date,
            pending: true,
            category_name: fixed.category?.name || null
          };
        })
        .filter(Boolean);

      const formattedIncomes = incomes.map(income => ({
        ...income,
        category_name: income.category?.name || null,
        pending: false
      }));

      const allIncomes = [
        ...formattedIncomes,
        ...generatedFixedIncomesWithLink
      ];
      this.incomeCache.set(cacheKey, allIncomes);
      return allIncomes;
    } catch (error) {
      console.error('Erro ao buscar rendas:', error);
      throw new Error('Erro ao buscar rendas.');
    }
  }

  async getExpenses(userId, filters = {}) {
    const { month, year, fixed } = filters;
    const cacheKey = `expense:${userId}:${month || ''}:${year || ''}:${fixed || ''}`;
    const cached = this.expenseCache.get(cacheKey);
    if (cached) return cached;

    try {
      const where = { user_id: userId };

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

      const expenses = await this.prisma.expense.findMany({
        where,
        include: {
          category: {
            select: { name: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      const fixedExpenses = await this.prisma.expense.findMany({
        where: {
          user_id: userId,
          isFixed: true,
          startDate: { lte: endDate || new Date() },
          OR: [{ endDate: null }, { endDate: { gte: startDate || new Date() } }]
        },
        include: {
          category: { select: { name: true } }
        }
      });

      const existingFixedExpenseIds = new Set(
        expenses.map(i => i.fixed_expense_id).filter(Boolean)
      );

      const generatedFixedExpensesWithLink = (fixedExpenses || [])
        .map(fixed => {
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
            const inRange =
              (!start ||
                recurYear > start.getFullYear() ||
                (recurYear === start.getFullYear() &&
                  recurMonth >= start.getMonth() + 1)) &&
              (!end ||
                recurYear < end.getFullYear() ||
                (recurYear === end.getFullYear() &&
                  recurMonth <= end.getMonth() + 1));
            if (inRange) {
              if (fixed.recurrenceType === 'monthly') shouldAppear = true;
              if (
                fixed.recurrenceType === 'yearly' &&
                start &&
                recurMonth === start.getMonth() + 1
              )
                shouldAppear = true;
            }
          }
          if (!shouldAppear) return null;
          if (existingFixedExpenseIds.has(fixed.id)) return null;
          const alreadyHasReal = expenses.some(
            i =>
              i.isFixed &&
              i.id === fixed.id &&
              i.date &&
              new Date(i.date).getFullYear() === parseInt(year) &&
              new Date(i.date).getMonth() + 1 === parseInt(month)
          );
          if (alreadyHasReal) return null;

          const date =
            month && year
              ? this.makeLocalDate(parseInt(year), parseInt(month), day)
              : fixed.startDate
                ? new Date(fixed.startDate)
                : new Date();
          return {
            ...fixed,
            id: `pending-${fixed.id}-${month}-${year}`,
            date,
            pending: true,
            category_name: fixed.category?.name || null
          };
        })
        .filter(Boolean);

      const formattedExpenses = expenses.map(expense => ({
        ...expense,
        category_name: expense.category?.name || null,
        pending: false
      }));

      const allExpenses = [
        ...formattedExpenses,
        ...generatedFixedExpensesWithLink
      ];
      this.expenseCache.set(cacheKey, allExpenses);
      return allExpenses;
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      throw new Error('Erro ao buscar despesas.');
    }
  }

  async getDashboardData(userId, month, year) {
    const cacheKey = `dashboard:${userId}:${month || ''}:${year || ''}`;
    const cached = this.dashboardCache.get(cacheKey);
    if (cached) return cached;

    try {
      const currentMonth = month || new Date().getMonth() + 1;
      const currentYear = year || new Date().getFullYear();

      const startDate = new Date(
        parseInt(currentYear),
        parseInt(currentMonth) - 1,
        1
      );
      const endDate = new Date(
        parseInt(currentYear),
        parseInt(currentMonth),
        1
      );

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { created_at: true }
      });

      const [incomeResult, expenseResult] = await Promise.all([
        this.prisma.income.aggregate({
          where: {
            user_id: userId,
            date: {
              gte: startDate,
              lt: endDate
            }
          },
          _sum: { value: true }
        }),
        this.prisma.expense.aggregate({
          where: {
            user_id: userId,
            date: {
              gte: startDate,
              lt: endDate
            }
          },
          _sum: { value: true }
        })
      ]);

      const yearStart = new Date(parseInt(currentYear), 0, 1);
      const yearEnd = new Date(parseInt(currentYear) + 1, 0, 1);

      const monthlyData = await this.prisma.$queryRaw`
        SELECT 
          EXTRACT(MONTH FROM date) as month,
          SUM(CASE WHEN "table" = 'income' THEN value ELSE 0 END) as income,
          SUM(CASE WHEN "table" = 'expense' THEN value ELSE 0 END) as expense
        FROM (
          SELECT date, value, 'income' as "table" FROM income WHERE user_id = ${userId} AND date >= ${yearStart} AND date < ${yearEnd}
          UNION ALL
          SELECT date, value, 'expense' as "table" FROM expense WHERE user_id = ${userId} AND date >= ${yearStart} AND date < ${yearEnd}
        ) combined_data
        GROUP BY EXTRACT(MONTH FROM date)
        ORDER BY month
      `;

      const categoryData = await this.prisma.$queryRaw`
        SELECT 
          c.name as category_name,
          COALESCE(SUM(e.value), 0) as total_value
        FROM category c
        LEFT JOIN expense e ON c.id = e.category_id 
          AND e.user_id = ${userId}
          AND e.date >= ${startDate}
          AND e.date < ${endDate}
        WHERE c.user_id = ${userId}
        GROUP BY c.id, c.name
        HAVING COALESCE(SUM(e.value), 0) > 0
        ORDER BY total_value DESC
      `;

      const formattedCategoryData = categoryData.map(cat => ({
        name: cat.category_name,
        value: parseFloat(cat.total_value) || 0
      }));

      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez'
      ];

      const processedMonthlyData = [];
      for (let i = 1; i <= 12; i++) {
        const monthData = monthlyData.find(row => parseInt(row.month) === i);
        processedMonthlyData.push({
          month: monthNames[i - 1],
          income: monthData ? parseFloat(monthData.income) || 0 : 0,
          expense: monthData ? parseFloat(monthData.expense) || 0 : 0
        });
      }

      const monthlyIncome = incomeResult._sum.value || 0;
      const monthlyExpense = expenseResult._sum.value || 0;

      const responseData = {
        monthlyIncome: Number(monthlyIncome),
        monthlyExpense: Number(monthlyExpense),
        saldo: monthlyIncome - monthlyExpense,
        monthlyData: processedMonthlyData,
        categoryData: formattedCategoryData,
        userCreatedAt: user.created_at,
        userCreatedYear: user.created_at.getFullYear(),
        userCreatedMonth: user.created_at.getMonth() + 1,
        currentMonth: parseInt(currentMonth),
        currentYear: parseInt(currentYear)
      };

      this.dashboardCache.set(cacheKey, responseData);
      return responseData;
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      throw new Error('Erro ao buscar resumo do dashboard.');
    }
  }

  async createIncome(userId, incomeData) {
    try {
      const parsedDate = this.parseDateString(incomeData.date);
      const parsedStartDate = this.parseDateString(incomeData.startDate);
      const parsedEndDate = this.parseDateString(incomeData.endDate);

      if (!parsedDate) {
        throw new Error('Data inválida. Formato esperado: YYYY-MM-DD');
      }

      if (incomeData.category_id) {
        const categoryExists = await this.prisma.category.findFirst({
          where: {
            id: parseInt(incomeData.category_id),
            user_id: userId
          }
        });
        if (!categoryExists) {
          throw new Error('Categoria não encontrada.');
        }
      }

      const isFixedBool =
        incomeData.isFixed === true ||
        incomeData.isFixed === 'true' ||
        incomeData.isFixed === 1 ||
        incomeData.isFixed === '1';

      const income = await this.prisma.income.create({
        data: {
          description: incomeData.description,
          value: parseFloat(incomeData.value),
          date: this.makeLocalDate(
            parsedDate.year,
            parsedDate.month,
            parsedDate.day
          ),
          user_id: userId,
          category_id: incomeData.category_id
            ? parseInt(incomeData.category_id)
            : null,
          isFixed: isFixedBool,
          recurrenceType: isFixedBool ? incomeData.recurrenceType : null,
          startDate:
            isFixedBool && parsedStartDate
              ? this.makeLocalDate(
                  parsedStartDate.year,
                  parsedStartDate.month,
                  parsedStartDate.day
                )
              : null,
          endDate:
            isFixedBool && parsedEndDate
              ? this.makeLocalDate(
                  parsedEndDate.year,
                  parsedEndDate.month,
                  parsedEndDate.day
                )
              : null,
          fixed_income_id: incomeData.fixed_income_id
            ? parseInt(incomeData.fixed_income_id)
            : null
        },
        include: {
          category: { select: { name: true } }
        }
      });

      this.incomeCache.clear();
      return income;
    } catch (error) {
      console.error('Erro ao criar receita:', error);
      throw error;
    }
  }

  async createExpense(userId, expenseData) {
    try {
      const parsedDate = this.parseDateString(expenseData.date);
      const parsedStartDate = this.parseDateString(expenseData.startDate);
      const parsedEndDate = this.parseDateString(expenseData.endDate);

      if (!parsedDate) {
        throw new Error('Data inválida. Formato esperado: YYYY-MM-DD');
      }

      if (expenseData.category_id) {
        const categoryExists = await this.prisma.category.findFirst({
          where: {
            id: parseInt(expenseData.category_id),
            user_id: userId
          }
        });
        if (!categoryExists) {
          throw new Error('Categoria não encontrada.');
        }
      }

      const isFixedBool =
        expenseData.isFixed === true ||
        expenseData.isFixed === 'true' ||
        expenseData.isFixed === 1 ||
        expenseData.isFixed === '1';

      const expense = await this.prisma.expense.create({
        data: {
          description: expenseData.description,
          value: parseFloat(expenseData.value),
          date: this.makeLocalDate(
            parsedDate.year,
            parsedDate.month,
            parsedDate.day
          ),
          user_id: userId,
          category_id: expenseData.category_id
            ? parseInt(expenseData.category_id)
            : null,
          isFixed: isFixedBool,
          recurrenceType: isFixedBool ? expenseData.recurrenceType : null,
          startDate:
            isFixedBool && parsedStartDate
              ? this.makeLocalDate(
                  parsedStartDate.year,
                  parsedStartDate.month,
                  parsedStartDate.day
                )
              : null,
          endDate:
            isFixedBool && parsedEndDate
              ? this.makeLocalDate(
                  parsedEndDate.year,
                  parsedEndDate.month,
                  parsedEndDate.day
                )
              : null,
          fixed_expense_id: expenseData.fixed_expense_id
            ? parseInt(expenseData.fixed_expense_id)
            : null
        },
        include: {
          category: { select: { name: true } }
        }
      });

      this.expenseCache.clear();
      return expense;
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      throw error;
    }
  }

  async updateIncome(userId, incomeId, incomeData) {
    try {
      // Primeiro, verificar se é uma receita fixa
      const existingIncome = await this.prisma.income.findFirst({
        where: {
          id: parseInt(incomeId),
          user_id: userId
        }
      });

      if (!existingIncome) {
        throw new Error('Renda não encontrada.');
      }

      // Preparar dados para atualização
      const updateData = {
        description: incomeData.description,
        value: parseFloat(incomeData.value),
        date: new Date(incomeData.date),
        category_id: incomeData.category_id
          ? parseInt(incomeData.category_id)
          : null
      };

      // Se for uma receita fixa, incluir os campos de recorrência
      if (existingIncome.isFixed) {
        const parsedStartDate = this.parseDateString(incomeData.startDate);
        const parsedEndDate = this.parseDateString(incomeData.endDate);

        updateData.recurrenceType = incomeData.recurrenceType;

        if (parsedStartDate) {
          updateData.startDate = this.makeLocalDate(
            parsedStartDate.year,
            parsedStartDate.month,
            parsedStartDate.day
          );
        }

        if (parsedEndDate) {
          updateData.endDate = this.makeLocalDate(
            parsedEndDate.year,
            parsedEndDate.month,
            parsedEndDate.day
          );
        } else if (incomeData.endDate === null || incomeData.endDate === '') {
          // Se endDate foi explicitamente definido como null/vazio, remover a data de fim
          updateData.endDate = null;
        }
      }

      const income = await this.prisma.income.update({
        where: {
          id: parseInt(incomeId),
          user_id: userId
        },
        data: updateData,
        include: {
          category: { select: { name: true } }
        }
      });

      const formattedIncome = {
        ...income,
        category_name: income.category?.name || null
      };

      this.incomeCache.clear();
      return formattedIncome;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Renda não encontrada.');
      }
      console.error('Erro ao editar renda:', error);
      throw error;
    }
  }

  async updateExpense(userId, expenseId, expenseData) {
    try {
      // Primeiro, verificar se é uma despesa fixa
      const existingExpense = await this.prisma.expense.findFirst({
        where: {
          id: parseInt(expenseId),
          user_id: userId
        }
      });

      if (!existingExpense) {
        throw new Error('Despesa não encontrada.');
      }

      // Preparar dados para atualização
      const updateData = {
        description: expenseData.description,
        value: parseFloat(expenseData.value),
        date: new Date(expenseData.date),
        category_id: expenseData.category_id
          ? parseInt(expenseData.category_id)
          : null
      };

      // Se for uma despesa fixa, incluir os campos de recorrência
      if (existingExpense.isFixed) {
        const parsedStartDate = this.parseDateString(expenseData.startDate);
        const parsedEndDate = this.parseDateString(expenseData.endDate);

        updateData.recurrenceType = expenseData.recurrenceType;

        if (parsedStartDate) {
          updateData.startDate = this.makeLocalDate(
            parsedStartDate.year,
            parsedStartDate.month,
            parsedStartDate.day
          );
        }

        if (parsedEndDate) {
          updateData.endDate = this.makeLocalDate(
            parsedEndDate.year,
            parsedEndDate.month,
            parsedEndDate.day
          );
        } else if (expenseData.endDate === null || expenseData.endDate === '') {
          // Se endDate foi explicitamente definido como null/vazio, remover a data de fim
          updateData.endDate = null;
        }
      }

      const expense = await this.prisma.expense.update({
        where: {
          id: parseInt(expenseId),
          user_id: userId
        },
        data: updateData,
        include: {
          category: { select: { name: true } }
        }
      });

      const formattedExpense = {
        ...expense,
        category_name: expense.category?.name || null
      };

      this.expenseCache.clear();
      return formattedExpense;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Despesa não encontrada.');
      }
      console.error('Erro ao editar despesa:', error);
      throw error;
    }
  }

  async deleteIncome(userId, incomeId) {
    try {
      await this.prisma.income.delete({
        where: {
          id: parseInt(incomeId),
          user_id: userId
        }
      });

      this.incomeCache.clear();
      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Renda não encontrada.');
      }
      console.error('Erro ao excluir renda:', error);
      throw error;
    }
  }

  async deleteExpense(userId, expenseId) {
    try {
      await this.prisma.expense.delete({
        where: {
          id: parseInt(expenseId),
          user_id: userId
        }
      });

      this.expenseCache.clear();
      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Despesa não encontrada.');
      }
      console.error('Erro ao excluir despesa:', error);
      throw error;
    }
  }

  clearUserCache(userId) {
    const incomeKeys = Array.from(this.incomeCache.keys());
    const expenseKeys = Array.from(this.expenseCache.keys());
    const dashboardKeys = Array.from(this.dashboardCache.keys());

    incomeKeys.forEach(key => {
      if (key.includes(`income:${userId}`)) {
        this.incomeCache.delete(key);
      }
    });

    expenseKeys.forEach(key => {
      if (key.includes(`expense:${userId}`)) {
        this.expenseCache.delete(key);
      }
    });

    dashboardKeys.forEach(key => {
      if (key.includes(`dashboard:${userId}`)) {
        this.dashboardCache.delete(key);
      }
    });
  }
}

module.exports = new FinanceService();
