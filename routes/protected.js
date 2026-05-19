const express = require('express');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

router.get('/dashboard', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
