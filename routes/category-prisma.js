const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const { LRUCache } = require('lru-cache');

const router = express.Router();

const categoryCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });

// Listar categorias do usuário (por tipo)
router.get('/', authMiddleware, async (req, res) => {
  const { type } = req.query; // income ou expense
  const cacheKey = `category:${req.user.id}:${type || ''}`;
  const cached = categoryCache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    const where = {
      user_id: req.user.id,
      ...(type && { type })
    };

    const categories = await prisma.category.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      }
    });

    categoryCache.set(cacheKey, categories);
    res.json(categories);
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
});

// Criar categoria
router.post('/', authMiddleware, async (req, res) => {
  const { name, type } = req.body;
  
  try {
    const category = await prisma.category.create({
      data: {
        name,
        type,
        user_id: req.user.id
      }
    });

    res.status(201).json(category);
  } catch (err) {
    console.error('Erro ao criar categoria:', err);
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
});

// Atualizar categoria
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;
  
  try {
    const category = await prisma.category.update({
      where: {
        id: parseInt(id),
        user_id: req.user.id // Garante que só o dono pode editar
      },
      data: {
        name,
        type
      }
    });

    res.json(category);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }
    console.error('Erro ao atualizar categoria:', err);
    res.status(500).json({ error: 'Erro ao atualizar categoria.' });
  }
});

// Excluir categoria
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.category.delete({
      where: {
        id: parseInt(id),
        user_id: req.user.id // Garante que só o dono pode excluir
      }
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }
    console.error('Erro ao excluir categoria:', err);
    res.status(500).json({ error: 'Erro ao excluir categoria.' });
  }
});

module.exports = router; 