/**
 * Insere categorias default faltantes para o usuário-dono.
 * Idempotente — usa skipDuplicates contra a constraint (user_id, name, type).
 * Útil após mudar a constraint para preencher categorias antes silenciosamente descartadas.
 * Uso: node scripts/backfill-default-categories.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const defaultCategories = require('../utils/default_categories');

async function main() {
  const email = process.env.OWNER_EMAIL;
  if (!email) {
    console.error('OWNER_EMAIL é obrigatório no .env');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`Usuário com email=${email} não encontrado.`);
      process.exit(1);
    }

    // RLS: scripts rodam fora de tx encadeada — SET (sem LOCAL) basta.
    // Se a migration de RLS ainda não foi aplicada, o SET cria a setting sem efeito colateral.
    await prisma.$executeRawUnsafe(`SET app.current_user_id = ${user.id}`);

    const result = await prisma.category.createMany({
      data: defaultCategories.map((c) => ({ name: c.name, type: c.type, user_id: user.id })),
      skipDuplicates: true
    });
    console.log(`Categorias inseridas: ${result.count}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro no backfill:', err);
  process.exit(1);
});
