const express = require('express');
const prismaService = require('../services/prisma.service');
const authMiddleware = require('../middleware/auth_middleware');
const { LRUCache } = require('lru-cache');

const router = express.Router();

const goalsCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 }); // 5 minutos

// Listar metas do usuário
router.get('/', authMiddleware, async (req, res) => {
  const cacheKey = `goals:${req.user.id}`;
  const cached = goalsCache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    const prisma = prismaService.getClient();
    const goals = await prisma.financialGoal.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' }
    });
    goalsCache.set(cacheKey, goals);
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar metas.' });
  }
});

// Criar nova meta
router.post('/', authMiddleware, async (req, res) => {
  const { name, description, target, deadline } = req.body;
  if (!name || !target) {
    return res
      .status(400)
      .json({ error: 'Nome e valor objetivo são obrigatórios.' });
  }
  try {
    const prisma = prismaService.getClient();
    const goal = await prisma.financialGoal.create({
      data: {
        user_id: req.user.id,
        name,
        description,
        target: parseFloat(target),
        deadline: deadline ? new Date(deadline) : null
      }
    });
    goalsCache.delete(`goals:${req.user.id}`);
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar meta.' });
  }
});

// Atualizar meta
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, target, deadline, status } = req.body;
  try {
    const prisma = prismaService.getClient();
    const goal = await prisma.financialGoal.update({
      where: { id: Number(id), user_id: req.user.id },
      data: {
        name,
        description,
        target: target ? parseFloat(target) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        status
      }
    });
    goalsCache.delete(`goals:${req.user.id}`);
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar meta.' });
  }
});

// Deletar meta
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const prisma = prismaService.getClient();
    await prisma.financialGoal.delete({
      where: { id: Number(id), user_id: req.user.id }
    });
    goalsCache.delete(`goals:${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar meta.' });
  }
});

// Adicionar valor guardado à meta
router.post('/:id/add', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (!amount) {
    return res.status(400).json({ error: 'Valor a adicionar é obrigatório.' });
  }
  try {
    const prisma = prismaService.getClient();
    const goal = await prisma.financialGoal.update({
      where: { id: Number(id), user_id: req.user.id },
      data: {
        saved: { increment: parseFloat(amount) }
      }
    });
    goalsCache.delete(`goals:${req.user.id}`);
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar valor à meta.' });
  }
});

module.exports = router;
