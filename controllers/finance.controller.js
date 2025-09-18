const financeService = require('../services/finance.service');

class FinanceController {
  async getIncomes(req, res) {
    try {
      const { month, year, fixed } = req.query;
      const userId = req.user.id;
      
      const incomes = await financeService.getIncomes(userId, { month, year, fixed });
      res.json(incomes);
    } catch (error) {
      console.error('Erro no controller de receitas:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getExpenses(req, res) {
    try {
      const { month, year, fixed } = req.query;
      const userId = req.user.id;
      
      const expenses = await financeService.getExpenses(userId, { month, year, fixed });
      res.json(expenses);
    } catch (error) {
      console.error('Erro no controller de despesas:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getDashboard(req, res) {
    try {
      const { month, year } = req.query;
      const userId = req.user.id;
      
      const dashboardData = await financeService.getDashboardData(userId, month, year);
      res.json(dashboardData);
    } catch (error) {
      console.error('Erro no controller do dashboard:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createIncome(req, res) {
    try {
      const userId = req.user.id;
      const incomeData = req.body;

      if (!incomeData.value || !incomeData.date) {
        return res.status(400).json({ error: "Valor e data são obrigatórios." });
      }

      const income = await financeService.createIncome(userId, incomeData);
      res.status(201).json(income);
    } catch (error) {
      console.error('Erro no controller de receitas:', error);
      if (error.message.includes('Data inválida') || error.message.includes('Categoria não encontrada')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async createExpense(req, res) {
    try {
      const userId = req.user.id;
      const expenseData = req.body;

      if (!expenseData.value || !expenseData.date) {
        return res.status(400).json({ error: "Valor e data são obrigatórios." });
      }

      const expense = await financeService.createExpense(userId, expenseData);
      res.status(201).json(expense);
    } catch (error) {
      console.error('Erro no controller de despesas:', error);
      if (error.message.includes('Data inválida') || error.message.includes('Categoria não encontrada')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async updateIncome(req, res) {
    try {
      const { id } = req.params;
      const { description, value, date, category_id } = req.body;
      const userId = req.user.id;
      
      const income = await financeService.updateIncome(userId, id, { description, value, date, category_id });
      res.json(income);
    } catch (error) {
      console.error('Erro no controller de receitas:', error);
      if (error.message === 'Renda não encontrada.') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const { description, value, date, category_id } = req.body;
      const userId = req.user.id;
      
      const expense = await financeService.updateExpense(userId, id, { description, value, date, category_id });
      res.json(expense);
    } catch (error) {
      console.error('Erro no controller de despesas:', error);
      if (error.message === 'Despesa não encontrada.') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async deleteIncome(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await financeService.deleteIncome(userId, id);
      res.json(result);
    } catch (error) {
      console.error('Erro no controller de receitas:', error);
      if (error.message === 'Renda não encontrada.') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await financeService.deleteExpense(userId, id);
      res.json(result);
    } catch (error) {
      console.error('Erro no controller de despesas:', error);
      if (error.message === 'Despesa não encontrada.') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new FinanceController();
