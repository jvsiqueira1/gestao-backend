const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDashboard() {
  console.log('🧪 Testando endpoint do dashboard...');
  
  try {
    // Simular uma requisição para o dashboard
    const testUserId = 1; // Assumindo que existe um usuário com ID 1
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    console.log(`📅 Testando para mês: ${currentMonth}, ano: ${currentYear}`);
    
    // Testar query de dados mensais
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);
    
    console.log('🔍 Testando query de dados mensais...');
    const monthlyData = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        SUM(CASE WHEN "table" = 'income' THEN value ELSE 0 END) as income,
        SUM(CASE WHEN "table" = 'expense' THEN value ELSE 0 END) as expense
      FROM (
        SELECT date, value, 'income' as "table" FROM income WHERE user_id = ${testUserId} AND date >= ${yearStart} AND date < ${yearEnd}
        UNION ALL
        SELECT date, value, 'expense' as "table" FROM expense WHERE user_id = ${testUserId} AND date >= ${yearStart} AND date < ${yearEnd}
      ) combined_data
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `;
    
    console.log('📊 Dados mensais encontrados:', monthlyData.length);
    console.log('📈 Primeiros 3 meses:', monthlyData.slice(0, 3));
    
    // Testar query de categorias
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 1);
    
    console.log('🔍 Testando query de categorias...');
    const categoryData = await prisma.$queryRaw`
      SELECT 
        c.name as category_name,
        COALESCE(SUM(e.value), 0) as total_value
      FROM category c
      LEFT JOIN expense e ON c.id = e.category_id 
        AND e.user_id = ${testUserId}
        AND e.date >= ${startDate}
        AND e.date < ${endDate}
      WHERE c.user_id = ${testUserId}
      GROUP BY c.id, c.name
      HAVING COALESCE(SUM(e.value), 0) > 0
      ORDER BY total_value DESC
    `;
    
    console.log('📊 Categorias encontradas:', categoryData.length);
    console.log('🏷️ Categorias:', categoryData);
    
    // Verificar se existem dados de teste
    const userCount = await prisma.user.count();
    const incomeCount = await prisma.income.count();
    const expenseCount = await prisma.expense.count();
    const categoryCount = await prisma.category.count();
    
    console.log('\n📋 Resumo do banco:');
    console.log(`👤 Usuários: ${userCount}`);
    console.log(`💰 Receitas: ${incomeCount}`);
    console.log(`💸 Despesas: ${expenseCount}`);
    console.log(`🏷️ Categorias: ${categoryCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  Nenhum usuário encontrado. Execute o seed primeiro.');
    }
    
    if (incomeCount === 0 && expenseCount === 0) {
      console.log('⚠️  Nenhuma transação encontrada. Adicione algumas receitas/despesas para testar.');
    }
    
    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboard();
