const categoryService = require('../services/category.service');

function statusFor(error) {
  if (error.code === 'BAD_REQUEST') return 400;
  if (error.code === 'NOT_FOUND') return 404;
  if (error.code === 'CONFLICT') return 409;
  return 500;
}

function respondError(res, error) {
  console.error('Erro no controller de categorias:', error);
  res.status(statusFor(error)).json({ error: error.message });
}

class CategoryController {
  async getCategories(req, res) {
    try {
      const { type } = req.query;
      const userId = req.user.id;
      const prisma = req.prisma;

      const categories = await categoryService.getCategoriesByUser(userId, type, prisma);
      res.json(categories);
    } catch (error) {
      respondError(res, error);
    }
  }

  async createCategory(req, res) {
    try {
      const { name, type } = req.body;
      const userId = req.user.id;
      const prisma = req.prisma;

      const category = await categoryService.createCategory(userId, { name, type }, prisma);
      res.status(201).json(category);
    } catch (error) {
      respondError(res, error);
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, type } = req.body;
      const userId = req.user.id;
      const prisma = req.prisma;

      const category = await categoryService.updateCategory(userId, id, { name, type }, prisma);
      res.json(category);
    } catch (error) {
      respondError(res, error);
    }
  }

  async getMissingDefaults(req, res) {
    try {
      const userId = req.user.id;
      const prisma = req.prisma;
      const missing = await categoryService.getMissingDefaults(userId, prisma);
      res.json(missing);
    } catch (error) {
      respondError(res, error);
    }
  }

  async restoreDefaults(req, res) {
    try {
      const userId = req.user.id;
      const prisma = req.prisma;
      const result = await categoryService.restoreDefaults(userId, prisma);
      res.json(result);
    } catch (error) {
      respondError(res, error);
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const prisma = req.prisma;

      const result = await categoryService.deleteCategory(userId, id, prisma);
      res.json(result);
    } catch (error) {
      respondError(res, error);
    }
  }
}

module.exports = new CategoryController();
