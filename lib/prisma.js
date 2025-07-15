const { PrismaClient } = require('@prisma/client');

let prisma;

try {
  prisma = new PrismaClient();
} catch (error) {
  console.error('Erro ao criar instância do Prisma:', error);
  throw error;
}

// Middleware para logging de queries (opcional)
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  return result;
});

// Teste de conexão
prisma.$connect()
  .catch((error) => {
    console.error('Erro ao conectar Prisma:', error);
  });

module.exports = prisma; 