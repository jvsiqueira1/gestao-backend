const express = require('express');
const { requireAuthWithRls } = require('../middleware/auth_middleware');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

// Listar categorias do usuário (por tipo)
router.get('/', requireAuthWithRls, categoryController.getCategories);

// Listar categorias padrão faltantes (deletadas)
router.get('/defaults/missing', requireAuthWithRls, categoryController.getMissingDefaults);

// Restaurar categorias padrão deletadas
router.post('/restore-defaults', requireAuthWithRls, categoryController.restoreDefaults);

// Criar categoria
router.post('/', requireAuthWithRls, categoryController.createCategory);

// Atualizar categoria
router.put('/:id', requireAuthWithRls, categoryController.updateCategory);

// Excluir categoria
router.delete('/:id', requireAuthWithRls, categoryController.deleteCategory);

module.exports = router;
