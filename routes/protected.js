const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { LRUCache } = require('lru-cache');

const router = express.Router();

const dashboardCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });

// Exemplo de rota protegida
router.get('/dashboard', authMiddleware, (req, res) => {
  const cacheKey = `dashboard:${req.user.id}`;
  const cached = dashboardCache.get(cacheKey);
  if (cached) return res.json(cached);
  const response = {
    message: 'Acesso liberado ao dashboard!',
    user: req.user
  };
  dashboardCache.set(cacheKey, response);
  res.json(response);
});

module.exports = router; 