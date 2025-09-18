const express = require('express');
const authMiddleware = require('../middleware/auth_middleware');
const financeController = require('../controllers/finance.controller');

const router = express.Router();

// Listar rendas
router.get('/income', authMiddleware, financeController.getIncomes);

// Listar despesas
router.get('/expense', authMiddleware, financeController.getExpenses);

// Dashboard: resumo mensal
router.get('/dashboard', authMiddleware, financeController.getDashboard);

// Criar renda
router.post('/income', authMiddleware, financeController.createIncome);

// Criar despesa
router.post('/expense', authMiddleware, financeController.createExpense);

// Editar renda
router.put('/income/:id', authMiddleware, financeController.updateIncome);

// Editar despesa
router.put('/expense/:id', authMiddleware, financeController.updateExpense);

// Excluir renda
router.delete('/income/:id', authMiddleware, financeController.deleteIncome);

// Excluir despesa
router.delete('/expense/:id', authMiddleware, financeController.deleteExpense);

module.exports = router;
