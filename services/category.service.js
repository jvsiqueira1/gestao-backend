const prismaService = require('./prisma.service');
const { LRUCache } = require('lru-cache');
const defaultCategories = require('../utils/default_categories');

const VALID_TYPES = ['expense', 'income'];

function badRequest(message) {
  const err = new Error(message);
  err.code = 'BAD_REQUEST';
  return err;
}

function conflict(message) {
  const err = new Error(message);
  err.code = 'CONFLICT';
  return err;
}

function normalizeName(rawName) {
  if (typeof rawName !== 'string') return '';
  return rawName.trim();
}

class CategoryService {
  constructor() {
    this.prisma = prismaService.getClient();
    this.categoryCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });
  }

  async getCategoriesByUser(userId, type = null, prisma = this.prisma) {
    const cacheKey = `category:${userId}:${type || ''}`;
    const cached = this.categoryCache.get(cacheKey);
    if (cached) return cached;

    try {
      const where = {
        user_id: userId,
        ...(type && { type })
      };

      const categories = await prisma.category.findMany({
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

  async createCategory(userId, categoryData, prisma = this.prisma) {
    const name = normalizeName(categoryData && categoryData.name);
    const type = categoryData && categoryData.type;

    if (!name) throw badRequest('Nome é obrigatório.');
    if (!VALID_TYPES.includes(type)) throw badRequest('Tipo inválido. Use "expense" ou "income".');

    try {
      const category = await prisma.category.create({
        data: { name, type, user_id: userId }
      });

      this.clearUserCache(userId);
      return category;
    } catch (error) {
      if (error.code === 'P2002') throw conflict('Categoria já existe.');
      console.error('Erro ao criar categoria:', error);
      throw new Error('Erro ao criar categoria.');
    }
  }

  async updateCategory(userId, categoryId, categoryData, prisma = this.prisma) {
    const name = normalizeName(categoryData && categoryData.name);
    const type = categoryData && categoryData.type;

    if (!name) throw badRequest('Nome é obrigatório.');
    if (!VALID_TYPES.includes(type)) throw badRequest('Tipo inválido. Use "expense" ou "income".');

    try {
      const category = await prisma.category.update({
        where: {
          id: parseInt(categoryId),
          user_id: userId
        },
        data: { name, type }
      });

      this.clearUserCache(userId);
      return category;
    } catch (error) {
      if (error.code === 'P2002') throw conflict('Categoria já existe.');
      if (error.code === 'P2025') {
        const err = new Error('Categoria não encontrada.');
        err.code = 'NOT_FOUND';
        throw err;
      }
      console.error('Erro ao atualizar categoria:', error);
      throw new Error('Erro ao atualizar categoria.');
    }
  }

  async deleteCategory(userId, categoryId, prisma = this.prisma) {
    try {
      await prisma.category.delete({
        where: {
          id: parseInt(categoryId),
          user_id: userId
        }
      });

      this.clearUserCache(userId);
      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        const err = new Error('Categoria não encontrada.');
        err.code = 'NOT_FOUND';
        throw err;
      }
      console.error('Erro ao excluir categoria:', error);
      throw new Error('Erro ao excluir categoria.');
    }
  }

  /**
   * Calcula quais categorias padrão estão faltando para o usuário
   * (consideradas faltantes se não existir o par exato name+type).
   */
  async getMissingDefaults(userId, prisma = this.prisma) {
    const existing = await prisma.category.findMany({
      where: { user_id: userId },
      select: { name: true, type: true }
    });
    const existingKeys = new Set(existing.map((c) => `${c.type}:${c.name}`));
    return defaultCategories.filter((c) => !existingKeys.has(`${c.type}:${c.name}`));
  }

  /**
   * Restaura categorias padrão deletadas. Idempotente — usa skipDuplicates
   * contra a constraint (user_id, name, type).
   * Retorna { restored: number, created: [{ name, type }, ...] }.
   */
  async restoreDefaults(userId, prisma = this.prisma) {
    const missing = await this.getMissingDefaults(userId, prisma);
    if (missing.length === 0) {
      return { restored: 0, created: [] };
    }
    try {
      const result = await prisma.category.createMany({
        data: missing.map((c) => ({ name: c.name, type: c.type, user_id: userId })),
        skipDuplicates: true
      });
      this.clearUserCache(userId);
      return { restored: result.count, created: missing };
    } catch (error) {
      console.error('Erro ao restaurar categorias padrão:', error);
      throw new Error('Erro ao restaurar categorias padrão.');
    }
  }

  clearUserCache(userId) {
    const keys = Array.from(this.categoryCache.keys());
    keys.forEach(key => {
      if (key.includes(`category:${userId}`)) {
        this.categoryCache.delete(key);
      }
    });
  }
}

module.exports = new CategoryService();
