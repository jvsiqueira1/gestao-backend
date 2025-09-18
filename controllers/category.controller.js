const categoryService = require('../services/category.service');

class CategoryController {
  async getCategories(req, res) {
    try {
      const { type } = req.query;
      const userId = req.user.id;
      
      const categories = await categoryService.getCategoriesByUser(userId, type);
      res.json(categories);
    } catch (error) {
      console.error('Erro no controller de categorias:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createCategory(req, res) {
    try {
      const { name, type } = req.body;
      const userId = req.user.id;
      
      const category = await categoryService.createCategory(userId, { name, type });
      res.status(201).json(category);
    } catch (error) {
      console.error('Erro no controller de categorias:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, type } = req.body;
      const userId = req.user.id;
      
      const category = await categoryService.updateCategory(userId, id, { name, type });
      res.json(category);
    } catch (error) {
      console.error('Erro no controller de categorias:', error);
      if (error.message === 'Categoria não encontrada.') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await categoryService.deleteCategory(userId, id);
      res.json(result);
    } catch (error) {
      console.error('Erro no controller de categorias:', error);
      if (error.message === 'Categoria não encontrada.') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new CategoryController();
