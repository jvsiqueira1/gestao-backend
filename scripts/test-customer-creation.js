const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prismaService = require('../services/prisma.service');

async function testCustomerCreation() {
  try {
    console.log('🔍 Testando criação de customer no Stripe...\n');

    // Buscar um usuário de teste
    const prisma = prismaService.getClient();
    const user = await prisma.user.findFirst({
      where: { email: 'joaovitorsc@gmail.com' }
    });

    if (!user) {
      console.log('❌ Usuário joaovitorsc@gmail.com não encontrado');
      return;
    }

    console.log(`👤 Usuário encontrado: ${user.name} (${user.email})`);
    console.log(
      `🆔 Stripe Customer ID atual: ${user.stripe_customer_id || 'Nenhum'}\n`
    );

    // Se não tem customer_id, criar um
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      console.log('🆕 Criando novo customer no Stripe...');

      const stripeCustomer = await stripe.customers.create({
        name: user.name,
        email: user.email,
        metadata: { user_id: user.id.toString() }
      });

      customerId = stripeCustomer.id;
      console.log(`✅ Customer criado: ${customerId}`);

      // Atualizar no banco
      await prisma.user.update({
        where: { id: user.id },
        data: { stripe_customer_id: customerId }
      });

      console.log('✅ Customer ID salvo no banco de dados');
    } else {
      console.log('✅ Customer já existe, usando o existente');
    }

    // Verificar se o customer existe no Stripe
    const customer = await stripe.customers.retrieve(customerId);
    console.log(`\n📋 Detalhes do Customer no Stripe:`);
    console.log(`   ID: ${customer.id}`);
    console.log(`   Nome: ${customer.name}`);
    console.log(`   Email: ${customer.email}`);
    console.log(
      `   Criado em: ${new Date(customer.created * 1000).toLocaleString('pt-BR')}`
    );

    // Verificar se há cupons associados
    const promotionCodes = await stripe.promotionCodes.list({
      customer: customerId,
      limit: 10
    });

    console.log(
      `\n🎫 Códigos promocionais para este customer: ${promotionCodes.data.length}`
    );

    if (promotionCodes.data.length > 0) {
      promotionCodes.data.forEach(code => {
        console.log(`   - ${code.code} (${code.active ? 'Ativo' : 'Inativo'})`);
      });
    }

    console.log('\n✅ Teste concluído com sucesso!');
    console.log(
      '💡 Agora você pode usar cupons específicos para este customer'
    );
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar o teste
testCustomerCreation();
