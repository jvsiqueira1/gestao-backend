const express = require('express');
const authMiddleware = require('../middleware/auth_middleware');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Endpoint para solicitar recuperação de senha
router.post('/esqueci-senha', authController.requestPasswordReset);

// Endpoint para trocar a senha usando o token
router.post('/trocar-senha', authController.resetPassword);

// Registrar usuário
router.post('/register', authController.register);

// Login de usuário
router.post('/login', authController.login);

// Retorna dados do usuário autenticado
router.get('/me', authMiddleware.requireAuth, authController.getCurrentUser);

module.exports = router;
