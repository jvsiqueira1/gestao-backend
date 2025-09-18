const express = require('express');
const prismaService = require('../services/prisma.service');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

// Middleware de autenticação
router.use(authMiddleware);

// GET - Listar todas as rendas fixas do usuário
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const prisma = prismaService.getClient();

    const fixedIncomes = await prisma.income.findMany({
      where: {
        user_id: userId,
        isFixed: true,
        fixed_income_id: null // Apenas as rendas fixas originais
      },
      include: {
        category: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json(fixedIncomes);
  } catch (error) {
    console.error('Erro ao buscar rendas fixas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Buscar uma renda fixa específica
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const incomeId = parseInt(req.params.id);
    const prisma = prismaService.getClient();

    const fixedIncome = await prisma.income.findFirst({
      where: {
        id: incomeId,
        user_id: userId,
        isFixed: true
      },
      include: {
        category: true
      }
    });

    if (!fixedIncome) {
      return res.status(404).json({ error: 'Renda fixa não encontrada' });
    }

    res.json(fixedIncome);
  } catch (error) {
    console.error('Erro ao buscar renda fixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Histórico de uma renda fixa
router.get('/:id/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const incomeId = parseInt(req.params.id);
    const prisma = prismaService.getClient();

    // Verificar se a renda fixa existe e pertence ao usuário
    const fixedIncome = await prisma.income.findFirst({
      where: {
        id: incomeId,
        user_id: userId,
        isFixed: true
      }
    });

    if (!fixedIncome) {
      return res.status(404).json({ error: 'Renda fixa não encontrada' });
    }

    // Buscar todos os lançamentos reais vinculados a esta renda fixa
    const linkedHistory = await prisma.income.findMany({
      where: {
        user_id: userId,
        isFixed: false,
        fixed_income_id: incomeId
      },
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Buscar também receitas similares (mesma descrição, valor e categoria, mas não vinculadas)
    const similarHistory = await prisma.income.findMany({
      where: {
        user_id: userId,
        isFixed: false,
        description: fixedIncome.description,
        category_id: fixedIncome.category_id,
        value: fixedIncome.value,
        fixed_income_id: null // Não vinculadas a outras receitas fixas
      },
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Combinar os históricos e remover duplicatas
    const allHistory = [...linkedHistory, ...similarHistory];
    // Remover duplicatas baseado no ID
    const uniqueHistory = allHistory.filter(
      (item, index, self) => index === self.findIndex(t => t.id === item.id)
    );

    // Ordenar por data (mais recente primeiro)
    const sortedHistory = uniqueHistory.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json(sortedHistory);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova renda fixa
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      description,
      value,
      category_id,
      recurrenceType,
      startDate,
      endDate
    } = req.body;
    const prisma = prismaService.getClient();

    if (!description || !value || !recurrenceType) {
      return res.status(400).json({
        error: 'Descrição, valor e tipo de recorrência são obrigatórios'
      });
    }

    // Criar a receita fixa
    const fixedIncome = await prisma.income.create({
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

    res.status(201).json(fixedIncome);
  } catch (error) {
    console.error('Erro ao criar renda fixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Atualizar renda fixa
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const incomeId = parseInt(req.params.id);
    const {
      description,
      value,
      category_id,
      recurrenceType,
      startDate,
      endDate
    } = req.body;
    const prisma = prismaService.getClient();

    // Verificar se a renda fixa existe e pertence ao usuário
    const existingIncome = await prisma.income.findFirst({
      where: {
        id: incomeId,
        user_id: userId,
        isFixed: true
      }
    });

    if (!existingIncome) {
      return res.status(404).json({ error: 'Renda fixa não encontrada' });
    }

    const updatedIncome = await prisma.income.update({
      where: { id: incomeId },
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

    res.json(updatedIncome);
  } catch (error) {
    console.error('Erro ao atualizar renda fixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE - Excluir renda fixa
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const incomeId = parseInt(req.params.id);
    const prisma = prismaService.getClient();

    // Verificar se a renda fixa existe e pertence ao usuário
    const existingIncome = await prisma.income.findFirst({
      where: {
        id: incomeId,
        user_id: userId,
        isFixed: true
      }
    });

    if (!existingIncome) {
      return res.status(404).json({ error: 'Renda fixa não encontrada' });
    }

    // Excluir todas as rendas geradas por esta renda fixa
    await prisma.income.deleteMany({
      where: {
        user_id: userId,
        fixed_income_id: incomeId
      }
    });

    // Excluir a renda fixa
    await prisma.income.delete({
      where: { id: incomeId }
    });

    res.json({ message: 'Renda fixa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir renda fixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
