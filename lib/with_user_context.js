const prismaService = require('../services/prisma.service');

/**
 * Roda `fn(tx)` dentro de uma transação Prisma com app.current_user_id setado
 * para o userId fornecido — habilita RLS por session var.
 *
 * SET LOCAL não aceita parâmetros, então usamos $executeRawUnsafe com
 * parseInt para blindar contra injection. userId vem sempre de req.user.id
 * (validado por JWT), nunca de input do cliente.
 */
async function withUserContext(userId, fn, { timeout = 30000 } = {}) {
  const id = parseInt(userId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('withUserContext: userId inválido.');
  }
  const prisma = prismaService.getClient();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = ${id}`);
    return fn(tx);
  }, { timeout });
}

module.exports = { withUserContext };
