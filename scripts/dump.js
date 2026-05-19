/**
 * Backup completo em JSON.
 * Funciona com schema antigo (com campos de billing) e novo (sem).
 * Uso: node scripts/dump.js [email]
 *   email opcional → exporta apenas dados desse usuário. Sem argumento → exporta todos.
 * Saída: dumps/data-YYYY-MM-DD-HHmm.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const SCHEMA_VERSION = 2;

async function main() {
  const prisma = new PrismaClient();
  const targetEmail = process.argv[2] || process.env.OWNER_EMAIL || null;

  const userFilter = targetEmail ? { email: targetEmail } : {};
  const users = await prisma.user.findMany({ where: userFilter });
  if (users.length === 0) {
    console.error(`Nenhum usuário encontrado${targetEmail ? ` para ${targetEmail}` : ''}.`);
    process.exit(1);
  }
  const userIds = users.map((u) => u.id);

  const [categories, incomes, expenses, financialGoals, passwordResetTokens] = await Promise.all([
    prisma.category.findMany({ where: { user_id: { in: userIds } } }),
    prisma.income.findMany({ where: { user_id: { in: userIds } } }),
    prisma.expense.findMany({ where: { user_id: { in: userIds } } }),
    prisma.financialGoal.findMany({ where: { user_id: { in: userIds } } }),
    prisma.passwordResetToken.findMany({ where: { userId: { in: userIds } } })
  ]);

  const payload = {
    meta: {
      schema_version: SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      user_count: users.length,
      record_counts: {
        users: users.length,
        categories: categories.length,
        incomes: incomes.length,
        expenses: expenses.length,
        financialGoals: financialGoals.length,
        passwordResetTokens: passwordResetTokens.length
      }
    },
    users,
    categories,
    incomes,
    expenses,
    financialGoals,
    passwordResetTokens
  };

  const dumpsDir = path.join(__dirname, '..', 'dumps');
  if (!fs.existsSync(dumpsDir)) fs.mkdirSync(dumpsDir, { recursive: true });

  const now = new Date();
  const stamp = `${now.toISOString().slice(0, 10)}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = path.join(dumpsDir, `data-${stamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`Dump salvo em: ${filename}`);
  console.log('Resumo:', payload.meta.record_counts);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Erro no dump:', err);
  process.exit(1);
});
