const express = require('express');
const { requireAuthWithRls } = require('../middleware/auth_middleware');

const router = express.Router();

router.get('/dashboard', requireAuthWithRls, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
