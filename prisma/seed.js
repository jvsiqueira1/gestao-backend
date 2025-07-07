const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Salário', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Investimento', type: 'income' },
  { name: 'Outros', type: 'income' },
  { name: 'Alimentação', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Moradia', type: 'expense' },
  { name: 'Lazer', type: 'expense' },
  { name: 'Saúde', type: 'expense' },
  { name: 'Educação', type: 'expense' },
  { name: 'Outros', type: 'expense' }
];

async function main() {
  // Criar usuário de teste
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'teste@exemplo.com' },
    update: {},
    create: {
      name: 'Usuário Teste',
      email: 'teste@exemplo.com',
      password: hashedPassword,
      subscription_status: 'trialing',
      plan: 'free',
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    }
  });

  // Criar categorias padrão para o usuário
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        user_id_name: {
          user_id: testUser.id,
          name: category.name
        }
      },
      update: {},
      create: {
        name: category.name,
        type: category.type,
        user_id: testUser.id
      }
    });
  }

  // Criar alguns dados de exemplo
  const categories = await prisma.category.findMany({
    where: { user_id: testUser.id }
  });

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Criar algumas receitas de exemplo
  const sampleIncomes = [
    { description: 'Salário Janeiro', value: 5000, date: new Date(2025, 0, 15), category_id: incomeCategories[0]?.id },
    { description: 'Freelance Projeto A', value: 1500, date: new Date(2025, 0, 20), category_id: incomeCategories[1]?.id },
    { description: 'Dividendos', value: 300, date: new Date(2025, 0, 25), category_id: incomeCategories[2]?.id }
  ];

  for (const income of sampleIncomes) {
    await prisma.income.create({
      data: {
        ...income,
        user_id: testUser.id
      }
    });
  }

  // Criar algumas despesas de exemplo
  const sampleExpenses = [
    { description: 'Supermercado', value: 800, date: new Date(2025, 0, 5), category_id: expenseCategories[0]?.id },
    { description: 'Combustível', value: 200, date: new Date(2025, 0, 10), category_id: expenseCategories[1]?.id },
    { description: 'Aluguel', value: 1200, date: new Date(2025, 0, 1), category_id: expenseCategories[2]?.id },
    { description: 'Cinema', value: 50, date: new Date(2025, 0, 12), category_id: expenseCategories[3]?.id },
    { description: 'Consulta Médica', value: 150, date: new Date(2025, 0, 18), category_id: expenseCategories[4]?.id }
  ];

  for (const expense of sampleExpenses) {
    await prisma.expense.create({
      data: {
        ...expense,
        user_id: testUser.id
      }
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 