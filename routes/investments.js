const express = require('express');
const authMiddleware = require('../middleware/auth_middleware');
const controller = require('../controllers/investment.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/', controller.list.bind(controller));
router.get('/summary', controller.summary.bind(controller));
router.get('/transactions', controller.transactions.bind(controller));
router.get('/:id', controller.get.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.remove.bind(controller));
router.post('/:id/transactions', controller.addTransaction.bind(controller));
router.delete('/:id/transactions/:txId', controller.deleteTransaction.bind(controller));
router.post('/:id/valuations', controller.addValuation.bind(controller));

module.exports = router;
