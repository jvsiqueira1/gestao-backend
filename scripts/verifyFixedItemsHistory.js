const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyFixedItemsHistory() {
  console.log('Verificando histórico de itens fixos...');
  
  try {
    // Verificar despesas fixas
    const fixedExpenses = await prisma.expense.findMany({
      where: {
        isFixed: true
      },
      include: {
        category: true
      }
    });
    
    console.log(`\n=== DESPESAS FIXAS (${fixedExpenses.length}) ===`);
    
    for (const fixedExpense of fixedExpenses) {
      console.log(`\nDespesa Fixa: ${fixedExpense.description} (ID: ${fixedExpense.id})`);
      
      // Buscar registros vinculados
      const linkedRecords = await prisma.expense.findMany({
        where: {
          fixed_expense_id: fixedExpense.id
        },
        orderBy: { date: 'asc' }
      });
      
      console.log(`  - Registros vinculados: ${linkedRecords.length}`);
      linkedRecords.forEach(record => {
        console.log(`    * ${new Date(record.date).toLocaleDateString('pt-BR')} - ${record.description}`);
      });
      
      // Buscar registros similares
      const similarRecords = await prisma.expense.findMany({
        where: {
          user_id: fixedExpense.user_id,
          isFixed: false,
          description: fixedExpense.description,
          category_id: fixedExpense.category_id,
          value: fixedExpense.value,
          fixed_expense_id: null
        },
        orderBy: { date: 'asc' }
      });
      
      console.log(`  - Registros similares: ${similarRecords.length}`);
      similarRecords.forEach(record => {
        console.log(`    * ${new Date(record.date).toLocaleDateString('pt-BR')} - ${record.description}`);
      });
      
      // Verificar se o primeiro mês está coberto
      const startDate = fixedExpense.startDate || fixedExpense.date;
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      
      const hasFirstMonth = [...linkedRecords, ...similarRecords].some(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === startMonth && recordDate.getFullYear() === startYear;
      });
      
      if (!hasFirstMonth) {
        console.log(`  ⚠️  PROBLEMA: Primeiro mês (${startMonth + 1}/${startYear}) não encontrado!`);
        
        // Criar o primeiro lançamento se não existir
        const firstExpense = await prisma.expense.create({
          data: {
            description: fixedExpense.description,
            value: fixedExpense.value,
            date: startDate,
            user_id: fixedExpense.user_id,
            category_id: fixedExpense.category_id,
            isFixed: false,
            fixed_expense_id: fixedExpense.id
          }
        });
        console.log(`  ✅ Criado primeiro lançamento: ${new Date(firstExpense.date).toLocaleDateString('pt-BR')}`);
      } else {
        console.log(`  ✅ Primeiro mês encontrado`);
      }
    }
    
    // Verificar receitas fixas
    const fixedIncomes = await prisma.income.findMany({
      where: {
        isFixed: true
      },
      include: {
        category: true
      }
    });
    
    console.log(`\n=== RECEITAS FIXAS (${fixedIncomes.length}) ===`);
    
    for (const fixedIncome of fixedIncomes) {
      console.log(`\nReceita Fixa: ${fixedIncome.description} (ID: ${fixedIncome.id})`);
      
      // Buscar registros vinculados
      const linkedRecords = await prisma.income.findMany({
        where: {
          fixed_income_id: fixedIncome.id
        },
        orderBy: { date: 'asc' }
      });
      
      console.log(`  - Registros vinculados: ${linkedRecords.length}`);
      linkedRecords.forEach(record => {
        console.log(`    * ${new Date(record.date).toLocaleDateString('pt-BR')} - ${record.description}`);
      });
      
      // Buscar registros similares
      const similarRecords = await prisma.income.findMany({
        where: {
          user_id: fixedIncome.user_id,
          isFixed: false,
          description: fixedIncome.description,
          category_id: fixedIncome.category_id,
          value: fixedIncome.value,
          fixed_income_id: null
        },
        orderBy: { date: 'asc' }
      });
      
      console.log(`  - Registros similares: ${similarRecords.length}`);
      similarRecords.forEach(record => {
        console.log(`    * ${new Date(record.date).toLocaleDateString('pt-BR')} - ${record.description}`);
      });
      
      // Verificar se o primeiro mês está coberto
      const startDate = fixedIncome.startDate || fixedIncome.date;
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      
      const hasFirstMonth = [...linkedRecords, ...similarRecords].some(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === startMonth && recordDate.getFullYear() === startYear;
      });
      
      if (!hasFirstMonth) {
        console.log(`  ⚠️  PROBLEMA: Primeiro mês (${startMonth + 1}/${startYear}) não encontrado!`);
        
        // Criar o primeiro lançamento se não existir
        const firstIncome = await prisma.income.create({
          data: {
            description: fixedIncome.description,
            value: fixedIncome.value,
            date: startDate,
            user_id: fixedIncome.user_id,
            category_id: fixedIncome.category_id,
            isFixed: false,
            fixed_income_id: fixedIncome.id
          }
        });
        console.log(`  ✅ Criado primeiro lançamento: ${new Date(firstIncome.date).toLocaleDateString('pt-BR')}`);
      } else {
        console.log(`  ✅ Primeiro mês encontrado`);
      }
    }
    
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('Erro ao verificar histórico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  verifyFixedItemsHistory();
}

module.exports = { verifyFixedItemsHistory }; 