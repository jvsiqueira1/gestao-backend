const { PrismaClient } = require('@prisma/client');

class PrismaService {
  constructor() {
    this.prisma = new PrismaClient();
    this.setupMiddleware();
    this.connect();
  }

  setupMiddleware() {
    // Middleware para logging de queries (opcional)
    this.prisma.$use(async (params, next) => {
      const _before = Date.now();
      const result = await next(params);
      const _after = Date.now();
      return result;
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('Prisma conectado com sucesso');
    } catch (error) {
      console.error('Erro ao conectar Prisma:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  getClient() {
    return this.prisma;
  }
}

// Singleton instance
const prismaService = new PrismaService();

module.exports = prismaService;
