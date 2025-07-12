const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupFixedItems() {
  console.log('Iniciando limpeza e correção de itens fixos...');
  
  try {
    // 1. Limpar receitas duplicadas (onde a mesma receita fixa foi criada múltiplas vezes)
    console.log('\n=== LIMPANDO RECEITAS DUPLICADAS ===');
    
    const allFixedIncomes = await prisma.income.findMany({
      where: {
        isFixed: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    // Agrupar por descrição, valor e categoria para identificar duplicatas
    const incomeGroups = {};
    allFixedIncomes.forEach(income => {
      const key = `${income.description}|${income.value}|${income.category_id}`;
      if (!incomeGroups[key]) {
        incomeGroups[key] = [];
      }
      incomeGroups[key].push(income);
    });
    
    for (const [key, incomes] of Object.entries(incomeGroups)) {
      if (incomes.length > 1) {
        console.log(`\nEncontradas ${incomes.length} receitas fixas duplicadas para: ${key}`);
        
        // Manter a primeira (mais antiga) e excluir as outras
        const [keepIncome, ...duplicates] = incomes;
        console.log(`  Mantendo: ID ${keepIncome.id} (criada em ${keepIncome.created_at})`);
        
        for (const duplicate of duplicates) {
          console.log(`  Excluindo: ID ${duplicate.id} (criada em ${duplicate.created_at})`);
          
          // Excluir lançamentos vinculados à duplicata
          await prisma.income.deleteMany({
            where: {
              fixed_income_id: duplicate.id
            }
          });
          
          // Excluir a receita fixa duplicada
          await prisma.income.delete({
            where: { id: duplicate.id }
          });
        }
      }
    }
    
    // 2. Limpar despesas duplicadas
    console.log('\n=== LIMPANDO DESPESAS DUPLICADAS ===');
    
    const allFixedExpenses = await prisma.expense.findMany({
      where: {
        isFixed: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    // Agrupar por descrição, valor e categoria para identificar duplicatas
    const expenseGroups = {};
    allFixedExpenses.forEach(expense => {
      const key = `${expense.description}|${expense.value}|${expense.category_id}`;
      if (!expenseGroups[key]) {
        expenseGroups[key] = [];
      }
      expenseGroups[key].push(expense);
    });
    
    for (const [key, expenses] of Object.entries(expenseGroups)) {
      if (expenses.length > 1) {
        console.log(`\nEncontradas ${expenses.length} despesas fixas duplicadas para: ${key}`);
        
        // Manter a primeira (mais antiga) e excluir as outras
        const [keepExpense, ...duplicates] = expenses;
        console.log(`  Mantendo: ID ${keepExpense.id} (criada em ${keepExpense.created_at})`);
        
        for (const duplicate of duplicates) {
          console.log(`  Excluindo: ID ${duplicate.id} (criada em ${duplicate.created_at})`);
          
          // Excluir lançamentos vinculados à duplicata
          await prisma.expense.deleteMany({
            where: {
              fixed_expense_id: duplicate.id
            }
          });
          
          // Excluir a despesa fixa duplicada
          await prisma.expense.delete({
            where: { id: duplicate.id }
          });
        }
      }
    }
    
    // 3. Verificar e corrigir histórico de receitas fixas
    console.log('\n=== CORRIGINDO HISTÓRICO DE RECEITAS FIXAS ===');
    
    const remainingFixedIncomes = await prisma.income.findMany({
      where: {
        isFixed: true
      }
    });
    
    for (const fixedIncome of remainingFixedIncomes) {
      console.log(`\nVerificando receita fixa: ${fixedIncome.description} (ID: ${fixedIncome.id})`);
      
      // Verificar se já existe um lançamento vinculado
      const existingLinkedIncome = await prisma.income.findFirst({
        where: {
          fixed_income_id: fixedIncome.id
        }
      });
      
      if (!existingLinkedIncome) {
        console.log(`  ❌ Nenhum lançamento vinculado encontrado`);
        
        // Verificar se existe um lançamento no mês inicial por descrição, valor e categoria
        const startDate = fixedIncome.startDate || fixedIncome.date;
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        
        const existingSimilarIncome = await prisma.income.findFirst({
          where: {
            user_id: fixedIncome.user_id,
            isFixed: false,
            description: fixedIncome.description,
            category_id: fixedIncome.category_id,
            value: fixedIncome.value,
            date: {
              gte: new Date(startYear, startMonth, 1),
              lt: new Date(startYear, startMonth + 1, 1)
            }
          }
        });
        
        if (!existingSimilarIncome) {
          // Criar o primeiro lançamento no mês inicial
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
          // Vincular o lançamento existente à receita fixa
          await prisma.income.update({
            where: { id: existingSimilarIncome.id },
            data: { fixed_income_id: fixedIncome.id }
          });
          console.log(`  ✅ Vinculado lançamento existente: ${new Date(existingSimilarIncome.date).toLocaleDateString('pt-BR')}`);
        }
      } else {
        console.log(`  ✅ Lançamento vinculado encontrado: ${new Date(existingLinkedIncome.date).toLocaleDateString('pt-BR')}`);
      }
    }
    
    // 4. Verificar e corrigir histórico de despesas fixas
    console.log('\n=== CORRIGINDO HISTÓRICO DE DESPESAS FIXAS ===');
    
    const remainingFixedExpenses = await prisma.expense.findMany({
      where: {
        isFixed: true
      }
    });
    
    for (const fixedExpense of remainingFixedExpenses) {
      console.log(`\nVerificando despesa fixa: ${fixedExpense.description} (ID: ${fixedExpense.id})`);
      
      // Verificar se já existe um lançamento vinculado
      const existingLinkedExpense = await prisma.expense.findFirst({
        where: {
          fixed_expense_id: fixedExpense.id
        }
      });
      
      if (!existingLinkedExpense) {
        console.log(`  ❌ Nenhum lançamento vinculado encontrado`);
        
        // Verificar se existe um lançamento no mês inicial por descrição, valor e categoria
        const startDate = fixedExpense.startDate || fixedExpense.date;
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        
        const existingSimilarExpense = await prisma.expense.findFirst({
          where: {
            user_id: fixedExpense.user_id,
            isFixed: false,
            description: fixedExpense.description,
            category_id: fixedExpense.category_id,
            value: fixedExpense.value,
            date: {
              gte: new Date(startYear, startMonth, 1),
              lt: new Date(startYear, startMonth + 1, 1)
            }
          }
        });
        
        if (!existingSimilarExpense) {
          // Criar o primeiro lançamento no mês inicial
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
          // Vincular o lançamento existente à despesa fixa
          await prisma.expense.update({
            where: { id: existingSimilarExpense.id },
            data: { fixed_expense_id: fixedExpense.id }
          });
          console.log(`  ✅ Vinculado lançamento existente: ${new Date(existingSimilarExpense.date).toLocaleDateString('pt-BR')}`);
        }
      } else {
        console.log(`  ✅ Lançamento vinculado encontrado: ${new Date(existingLinkedExpense.date).toLocaleDateString('pt-BR')}`);
      }
    }
    
    console.log('\n✅ Limpeza e correção concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro ao limpar e corrigir itens fixos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  cleanupFixedItems();
}

module.exports = { cleanupFixedItems }; 