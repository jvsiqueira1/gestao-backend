const express = require('express');
const prismaService = require('../services/prisma.service');
const authMiddleware = require('../middleware/auth_middleware');
const { LRUCache } = require('lru-cache');

const router = express.Router();

const categoryCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });

// Listar categorias do usuário (por tipo)
router.get('/', authMiddleware, async (req, res) => {
  const { type, _refresh } = req.query; // income ou expense
  const cacheKey = `category:${req.user.id}:${type || ''}`;
  
  // Se _refresh estiver presente, ignorar cache
  if (!_refresh) {
    const cached = categoryCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  }
  
  try {
    const prisma = prismaService.getClient();
    const where = {
      user_id: req.user.id
    };
    
    if (type) {
      where.type = type;
    }
    
    const categories = await prisma.category.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });
    
    categoryCache.set(cacheKey, categories);
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json(categories);
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
});

// Criar nova categoria
router.post('/', authMiddleware, async (req, res) => {
  const { name, type } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ error: 'Nome e tipo são obrigatórios.' });
  }
  
  try {
    const prisma = prismaService.getClient();
    const category = await prisma.category.create({
      data: {
        name,
        type,
        user_id: req.user.id
      }
    });
    
    // Limpar cache para este usuário
    const cacheKeys = categoryCache.keys();
    cacheKeys.forEach(key => {
      if (key.includes(`category:${req.user.id}`)) {
        categoryCache.delete(key);
      }
    });
    
    res.status(201).json(category);
  } catch (err) {
    console.error('Erro ao criar categoria:', err);
    
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Já existe uma categoria com este nome.' });
    }
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
});

// Editar categoria
router.put('/:id', authMiddleware, async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }
  try {
    const prisma = prismaService.getClient();
    const category = await prisma.category.update({
      where: {
        id: parseInt(id),
        user_id: req.user.id
      },
      data: {
        name
      }
    });
    res.json(category);
  } catch (err) {
    console.error('Erro ao editar categoria:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Já existe uma categoria com este nome.' });
    }
    res.status(500).json({ error: 'Erro ao editar categoria.' });
  }
});

// Excluir categoria
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const prisma = prismaService.getClient();
    await prisma.category.delete({
      where: {
        id: parseInt(id),
        user_id: req.user.id
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir categoria:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }
    res.status(500).json({ error: 'Erro ao excluir categoria.' });
  }
});

module.exports = router; 