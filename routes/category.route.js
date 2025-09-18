const express = require('express');
const authMiddleware = require('../middleware/auth_middleware');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

// Listar categorias do usuário (por tipo)
router.get('/', authMiddleware, categoryController.getCategories);

// Criar categoria
router.post('/', authMiddleware, categoryController.createCategory);

// Atualizar categoria
router.put('/:id', authMiddleware, categoryController.updateCategory);

// Excluir categoria
router.delete('/:id', authMiddleware, categoryController.deleteCategory);

module.exports = router;
