const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testando conexão com o banco Neon...');
  
  try {
    // Testar conexão básica
    await prisma.$connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Testar query simples
    const userCount = await prisma.user.count();
    console.log(`📊 Número de usuários no banco: ${userCount}`);
    
    // Testar query de categorias
    const categoryCount = await prisma.category.count();
    console.log(`📊 Número de categorias no banco: ${categoryCount}`);
    
    // Testar query de despesas
    const expenseCount = await prisma.expense.count();
    console.log(`📊 Número de despesas no banco: ${expenseCount}`);
    
    // Testar query de receitas
    const incomeCount = await prisma.income.count();
    console.log(`📊 Número de receitas no banco: ${incomeCount}`);
    
    console.log('🎉 Todos os testes passaram! O banco está funcionando perfeitamente.');
    
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco:', error.message);
    console.error('💡 Verifique se:');
    console.error('   - A DATABASE_URL está correta');
    console.error('   - O banco Neon está ativo');
    console.error('   - As migrations foram executadas');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection(); 