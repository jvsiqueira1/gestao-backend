const { PrismaClient } = require('@prisma/client');

console.log('=== DEBUG PRISMA CLIENT ===');
console.log('PrismaClient disponível:', !!PrismaClient);

let prisma;

try {
  prisma = new PrismaClient();
  console.log('Instância do Prisma criada:', !!prisma);
  console.log('Modelos disponíveis:', Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_')));
  console.log('PasswordResetToken disponível:', !!(prisma && prisma.passwordResetToken));
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
  .then(() => {
    console.log('✅ Prisma conectado com sucesso');
  })
  .catch((error) => {
    console.error('❌ Erro ao conectar Prisma:', error);
  });

module.exports = prisma; 