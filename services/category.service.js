const prismaService = require('./prisma.service');
const { LRUCache } = require('lru-cache');

class CategoryService {
  constructor() {
    this.prisma = prismaService.getClient();
    this.categoryCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
  }

  async getCategoriesByUser(userId, type = null) {
    const cacheKey = `category:${userId}:${type || ''}`;
    const cached = this.categoryCache.get(cacheKey);
    if (cached) return cached;

    try {
      const where = {
        user_id: userId,
        ...(type && { type })
      };

      const categories = await this.prisma.category.findMany({
        where,
        orderBy: {
          created_at: 'desc'
        }
      });

      this.categoryCache.set(cacheKey, categories);
      return categories;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw new Error('Erro ao buscar categorias.');
    }
  }

  async createCategory(userId, categoryData) {
    try {
      const category = await this.prisma.category.create({
        data: {
          name: categoryData.name,
          type: categoryData.type,
          user_id: userId
        }
      });

      // Limpar cache
      this.clearUserCache(userId);
      return category;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      throw new Error('Erro ao criar categoria.');
    }
  }

  async updateCategory(userId, categoryId, categoryData) {
    try {
      const category = await this.prisma.category.update({
        where: {
          id: parseInt(categoryId),
          user_id: userId
        },
        data: {
          name: categoryData.name,
          type: categoryData.type
        }
      });

      // Limpar cache
      this.clearUserCache(userId);
      return category;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Categoria não encontrada.');
      }
      console.error('Erro ao atualizar categoria:', error);
      throw new Error('Erro ao atualizar categoria.');
    }
  }

  async deleteCategory(userId, categoryId) {
    try {
      await this.prisma.category.delete({
        where: {
          id: parseInt(categoryId),
          user_id: userId
        }
      });

      // Limpar cache
      this.clearUserCache(userId);
      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Categoria não encontrada.');
      }
      console.error('Erro ao excluir categoria:', error);
      throw new Error('Erro ao excluir categoria.');
    }
  }

  clearUserCache(userId) {
    // Limpar cache do usuário
    const keys = Array.from(this.categoryCache.keys());
    keys.forEach(key => {
      if (key.includes(`category:${userId}`)) {
        this.categoryCache.delete(key);
      }
    });
  }
}

module.exports = new CategoryService();
