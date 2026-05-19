/**
 * Restaura um dump JSON gerado por scripts/dump.js.
 * Uso: node scripts/restore.js dumps/data-YYYY-MM-DD-HHmm.json [--wipe]
 *   --wipe  apaga registros existentes do(s) usuário(s) do dump antes de inserir
 * Mantém os IDs originais.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const file = process.argv[2];
  const wipe = process.argv.includes('--wipe');
  if (!file) {
    console.error('Uso: node scripts/restore.js <dump.json> [--wipe]');
    process.exit(1);
  }
  const absolute = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolute)) {
    console.error(`Arquivo não encontrado: ${absolute}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(absolute, 'utf-8'));
  const prisma = new PrismaClient();
  const userIds = (payload.users || []).map((u) => u.id);

  if (wipe && userIds.length > 0) {
    console.log(`Limpando dados existentes dos usuários: ${userIds.join(', ')}`);
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.financialGoal.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.expense.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.income.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.category.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  const stripBilling = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    password: u.password,
    created_at: u.created_at ? new Date(u.created_at) : undefined,
    updated_at: u.updated_at ? new Date(u.updated_at) : undefined
  });

  for (const u of payload.users || []) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: stripBilling(u),
      create: stripBilling(u)
    });
  }
  console.log(`Usuários: ${payload.users?.length || 0}`);

  for (const c of payload.categories || []) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: { name: c.name, type: c.type, user_id: c.user_id },
      create: {
        id: c.id,
        name: c.name,
        type: c.type,
        user_id: c.user_id,
        created_at: c.created_at ? new Date(c.created_at) : undefined,
        updated_at: c.updated_at ? new Date(c.updated_at) : undefined
      }
    });
  }
  console.log(`Categorias: ${payload.categories?.length || 0}`);

  const dateify = (v) => (v ? new Date(v) : undefined);
  const incomeFields = (i) => ({
    description: i.description,
    value: i.value,
    date: new Date(i.date),
    user_id: i.user_id,
    category_id: i.category_id ?? null,
    isFixed: !!i.isFixed,
    recurrenceType: i.recurrenceType ?? null,
    startDate: dateify(i.startDate) ?? null,
    endDate: dateify(i.endDate) ?? null,
    fixed_income_id: i.fixed_income_id ?? null,
    created_at: dateify(i.created_at),
    updated_at: dateify(i.updated_at)
  });
  const expenseFields = (e) => ({
    description: e.description,
    value: e.value,
    date: new Date(e.date),
    user_id: e.user_id,
    category_id: e.category_id ?? null,
    isFixed: !!e.isFixed,
    recurrenceType: e.recurrenceType ?? null,
    startDate: dateify(e.startDate) ?? null,
    endDate: dateify(e.endDate) ?? null,
    fixed_expense_id: e.fixed_expense_id ?? null,
    created_at: dateify(e.created_at),
    updated_at: dateify(e.updated_at)
  });

  for (const i of payload.incomes || []) {
    await prisma.income.upsert({ where: { id: i.id }, update: incomeFields(i), create: { id: i.id, ...incomeFields(i) } });
  }
  console.log(`Rendas: ${payload.incomes?.length || 0}`);

  for (const e of payload.expenses || []) {
    await prisma.expense.upsert({ where: { id: e.id }, update: expenseFields(e), create: { id: e.id, ...expenseFields(e) } });
  }
  console.log(`Despesas: ${payload.expenses?.length || 0}`);

  for (const g of payload.financialGoals || []) {
    await prisma.financialGoal.upsert({
      where: { id: g.id },
      update: {
        name: g.name,
        description: g.description ?? null,
        target: g.target,
        saved: g.saved,
        deadline: dateify(g.deadline) ?? null,
        status: g.status,
        user_id: g.user_id
      },
      create: {
        id: g.id,
        name: g.name,
        description: g.description ?? null,
        target: g.target,
        saved: g.saved,
        deadline: dateify(g.deadline) ?? null,
        status: g.status,
        user_id: g.user_id,
        created_at: dateify(g.created_at),
        updated_at: dateify(g.updated_at)
      }
    });
  }
  console.log(`Metas: ${payload.financialGoals?.length || 0}`);

  console.log('Restore concluído.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Erro no restore:', err);
  process.exit(1);
});
