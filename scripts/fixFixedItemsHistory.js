const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixFixedItemsHistory() {
  console.log('Iniciando correção do histórico de itens fixos...');
  
  try {
    // Buscar despesas fixas que não têm lançamentos vinculados
    const fixedExpenses = await prisma.expense.findMany({
      where: {
        isFixed: true
      },
      include: {
        category: true
      }
    });
    
    console.log(`Encontradas ${fixedExpenses.length} despesas fixas`);
    
    for (const fixedExpense of fixedExpenses) {
      // Verificar se já existe um lançamento vinculado
      const existingLinkedExpense = await prisma.expense.findFirst({
        where: {
          fixed_expense_id: fixedExpense.id
        }
      });
      
      if (!existingLinkedExpense) {
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
          await prisma.expense.create({
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
          console.log(`Criado primeiro lançamento para despesa fixa: ${fixedExpense.description} (ID: ${fixedExpense.id})`);
        } else {
          // Vincular o lançamento existente à despesa fixa
          await prisma.expense.update({
            where: { id: existingSimilarExpense.id },
            data: { fixed_expense_id: fixedExpense.id }
          });
          console.log(`Vinculado lançamento existente à despesa fixa: ${fixedExpense.description} (ID: ${fixedExpense.id})`);
        }
      }
    }
    
    // Buscar receitas fixas que não têm lançamentos vinculados
    const fixedIncomes = await prisma.income.findMany({
      where: {
        isFixed: true
      },
      include: {
        category: true
      }
    });
    
    console.log(`Encontradas ${fixedIncomes.length} receitas fixas`);
    
    for (const fixedIncome of fixedIncomes) {
      // Verificar se já existe um lançamento vinculado
      const existingLinkedIncome = await prisma.income.findFirst({
        where: {
          fixed_income_id: fixedIncome.id
        }
      });
      
      if (!existingLinkedIncome) {
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
          await prisma.income.create({
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
          console.log(`Criado primeiro lançamento para receita fixa: ${fixedIncome.description} (ID: ${fixedIncome.id})`);
        } else {
          // Vincular o lançamento existente à receita fixa
          await prisma.income.update({
            where: { id: existingSimilarIncome.id },
            data: { fixed_income_id: fixedIncome.id }
          });
          console.log(`Vinculado lançamento existente à receita fixa: ${fixedIncome.description} (ID: ${fixedIncome.id})`);
        }
      }
    }
    
    console.log('Correção do histórico de itens fixos concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro ao corrigir histórico de itens fixos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  fixFixedItemsHistory();
}

module.exports = { fixFixedItemsHistory }; 