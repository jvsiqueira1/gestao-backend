const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware de autenticação
router.use(authMiddleware);

// GET - Listar todas as despesas fixas do usuário
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const fixedExpenses = await prisma.expense.findMany({
      where: {
        user_id: userId,
        isFixed: true,
        fixed_expense_id: null // Apenas as despesas fixas originais
      },
      include: {
        category: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json(fixedExpenses);
  } catch (error) {
    console.error('Erro ao buscar despesas fixas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Buscar uma despesa fixa específica
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = parseInt(req.params.id);

    const fixedExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        user_id: userId,
        isFixed: true
      },
      include: {
        category: true
      }
    });

    if (!fixedExpense) {
      return res.status(404).json({ error: 'Despesa fixa não encontrada' });
    }

    res.json(fixedExpense);
  } catch (error) {
    console.error('Erro ao buscar despesa fixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Histórico de uma despesa fixa
router.get('/:id/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = parseInt(req.params.id);

    // Verificar se a despesa fixa existe e pertence ao usuário
    const fixedExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        user_id: userId,
        isFixed: true
      }
    });

    if (!fixedExpense) {
      return res.status(404).json({ error: 'Despesa fixa não encontrada' });
    }

    // Buscar todos os lançamentos reais vinculados a esta despesa fixa
    const linkedHistory = await prisma.expense.findMany({
      where: {
        user_id: userId,
        isFixed: false,
        fixed_expense_id: expenseId
      },
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Buscar também despesas similares (mesma descrição, valor e categoria, mas não vinculadas)
    const similarHistory = await prisma.expense.findMany({
      where: {
        user_id: userId,
        isFixed: false,
        description: fixedExpense.description,
        category_id: fixedExpense.category_id,
        value: fixedExpense.value,
        fixed_expense_id: null // Não vinculadas a outras despesas fixas
      },
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Combinar os históricos e remover duplicatas
    let allHistory = [...linkedHistory, ...similarHistory];
    // Remover duplicatas baseado no ID
    const uniqueHistory = allHistory.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    // Ordenar por data (mais recente primeiro)
    const sortedHistory = uniqueHistory.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json(sortedHistory);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova despesa fixa
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { description, value, category_id, recurrenceType, startDate, endDate } = req.body;

    if (!description || !value || !recurrenceType) {
      return res.status(400).json({ error: 'Descrição, valor e tipo de recorrência são obrigatórios' });
    }

    // Criar a despesa fixa
    const fixedExpense = await prisma.expense.create({
      data: {
        description,
        value: parseFloat(value),
        date: new Date(startDate || new Date()),
        user_id: userId,
        category_id: category_id ? parseInt(category_id) : null,
        isFixed: true,
        recurrenceType,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null
      },
      include: {
        category: true
      }
    });

    res.status(201).json(fixedExpense);
  } catch (error) {
    console.error('Erro ao criar despesa fixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Atualizar despesa fixa
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = parseInt(req.params.id);
    const { description, value, category_id, recurrenceType, startDate, endDate } = req.body;

    // Verificar se a despesa fixa existe e pertence ao usuário
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        user_id: userId,
        isFixed: true
      }
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Despesa fixa não encontrada' });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        description,
        value: value ? parseFloat(value) : undefined,
        category_id: category_id ? parseInt(category_id) : null,
        recurrenceType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        updated_at: new Date()
      },
      include: {
        category: true
      }
    });

    res.json(updatedExpense);
  } catch (error) {
    console.error('Erro ao atualizar despesa fixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE - Excluir despesa fixa
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = parseInt(req.params.id);

    // Verificar se a despesa fixa existe e pertence ao usuário
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        user_id: userId,
        isFixed: true
      }
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Despesa fixa não encontrada' });
    }

    // Excluir todas as despesas geradas por esta despesa fixa
    await prisma.expense.deleteMany({
      where: {
        user_id: userId,
        fixed_expense_id: expenseId
      }
    });

    // Excluir a despesa fixa
    await prisma.expense.delete({
      where: { id: expenseId }
    });

    res.json({ message: 'Despesa fixa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir despesa fixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 