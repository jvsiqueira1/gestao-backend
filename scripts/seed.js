/**
 * Cria/atualiza o usuário-dono e suas categorias default.
 * Idempotente — pode rodar quantas vezes precisar.
 * Lê de env: OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME.
 * Uso: node scripts/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const defaultCategories = require('../utils/default_categories');

async function main() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME || 'João Vitor';

  if (!email || !password) {
    console.error('OWNER_EMAIL e OWNER_PASSWORD são obrigatórios no .env');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: passwordHash },
    create: { email, name, password: passwordHash }
  });
  console.log(`Usuário ok: id=${user.id} email=${user.email}`);

  const existing = await prisma.category.findMany({
    where: { user_id: user.id },
    select: { name: true, type: true }
  });
  const existingKeys = new Set(existing.map((c) => `${c.type}:${c.name}`));
  const toCreate = defaultCategories.filter((c) => !existingKeys.has(`${c.type}:${c.name}`));

  if (toCreate.length > 0) {
    await prisma.category.createMany({
      data: toCreate.map((c) => ({ name: c.name, type: c.type, user_id: user.id })),
      skipDuplicates: true
    });
    console.log(`Categorias inseridas: ${toCreate.length}`);
  } else {
    console.log('Todas categorias default já existem.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
