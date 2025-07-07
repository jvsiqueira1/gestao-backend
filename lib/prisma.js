const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Middleware para logging de queries (opcional)
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  return result;
});

module.exports = prisma; 