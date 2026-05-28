/**
 * Diagnóstico: lista RLS state real de cada tabela.
 * Uso: node scripts/check-rls.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced,
        (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `;
    console.log('Tabela'.padEnd(30), 'RLS', 'FORCE', 'POLICIES');
    console.log('-'.repeat(60));
    for (const r of rows) {
      console.log(
        String(r.table_name).padEnd(30),
        String(r.rls_enabled).padEnd(5),
        String(r.rls_forced).padEnd(5),
        String(r.policy_count)
      );
    }

    const fn = await prisma.$queryRaw`
      SELECT proname FROM pg_proc WHERE proname = 'app_current_user_id'
    `;
    console.log('\nFunção app_current_user_id existe:', fn.length > 0);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
