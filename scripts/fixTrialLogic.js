const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTrialLogic() {
  console.log('Iniciando correção da lógica de trial...');
  
  try {
    // Buscar usuários que têm planos pagos ativos mas ainda têm trial_end
    const usersWithActivePaidPlans = await prisma.user.findMany({
      where: {
        AND: [
          {
            subscription_status: 'active'
          },
          {
            OR: [
              { plan: 'anual' },
              { plan: 'mensal' },
              { plan: 'PREMIUM' }
            ]
          },
          {
            trial_end: {
              not: null
            }
          }
        ]
      }
    });
    
    console.log(`Encontrados ${usersWithActivePaidPlans.length} usuários com planos pagos ativos que ainda têm trial_end`);
    
    // Zerar trial_end para esses usuários
    for (const user of usersWithActivePaidPlans) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          trial_end: null
        }
      });
      console.log(`Trial zerado para usuário ${user.email} (ID: ${user.id})`);
    }
    
    // Buscar usuários que têm planos cancelados mas ainda têm trial_end
    const usersWithCanceledPaidPlans = await prisma.user.findMany({
      where: {
        AND: [
          {
            subscription_status: 'canceled'
          },
          {
            OR: [
              { plan: 'anual' },
              { plan: 'mensal' }
            ]
          },
          {
            trial_end: {
              not: null
            }
          }
        ]
      }
    });
    
    console.log(`Encontrados ${usersWithCanceledPaidPlans.length} usuários com planos cancelados que ainda têm trial_end`);
    
    // Zerar trial_end para esses usuários também
    for (const user of usersWithCanceledPaidPlans) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          trial_end: null
        }
      });
      console.log(`Trial zerado para usuário cancelado ${user.email} (ID: ${user.id})`);
    }
    
    // Verificar usuários que têm premium_until mas não têm trial_end definido
    const usersWithPremiumUntil = await prisma.user.findMany({
      where: {
        AND: [
          {
            premium_until: {
              not: null
            }
          },
          {
            trial_end: {
              not: null
            }
          }
        ]
      }
    });
    
    console.log(`Encontrados ${usersWithPremiumUntil.length} usuários com premium_until que ainda têm trial_end`);
    
    // Zerar trial_end para esses usuários também
    for (const user of usersWithPremiumUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          trial_end: null
        }
      });
      console.log(`Trial zerado para usuário com premium_until ${user.email} (ID: ${user.id})`);
    }
    
    console.log('Correção da lógica de trial concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro ao corrigir lógica de trial:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  fixTrialLogic();
}

module.exports = { fixTrialLogic }; 