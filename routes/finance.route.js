const express = require('express');
const { requireAuthWithRls } = require('../middleware/auth_middleware');
const financeController = require('../controllers/finance.controller');

const router = express.Router();

// Listar rendas
router.get('/income', requireAuthWithRls, financeController.getIncomes);

// Listar despesas
router.get('/expense', requireAuthWithRls, financeController.getExpenses);

// Dashboard: resumo mensal
router.get('/dashboard', requireAuthWithRls, financeController.getDashboard);

// Criar renda
router.post('/income', requireAuthWithRls, financeController.createIncome);

// Criar despesa
router.post('/expense', requireAuthWithRls, financeController.createExpense);

// Editar renda
router.put('/income/:id', requireAuthWithRls, financeController.updateIncome);

// Editar despesa
router.put('/expense/:id', requireAuthWithRls, financeController.updateExpense);

// Excluir renda
router.delete('/income/:id', requireAuthWithRls, financeController.deleteIncome);

// Excluir despesa
router.delete('/expense/:id', requireAuthWithRls, financeController.deleteExpense);

module.exports = router;
