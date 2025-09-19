const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prismaService = require('../services/prisma.service');

async function createUserSpecificCoupon() {
  try {
    console.log('🎫 Criando cupom específico para usuário...\n');

    // Buscar o usuário
    const prisma = prismaService.getClient();
    const user = await prisma.user.findFirst({
      where: { email: 'joaovitorsc@gmail.com' }
    });

    if (!user) {
      console.log('❌ Usuário joaovitorsc@gmail.com não encontrado');
      return;
    }

    console.log(`👤 Usuário: ${user.name} (${user.email})`);
    console.log(
      `🆔 Stripe Customer ID: ${user.stripe_customer_id || 'Nenhum'}\n`
    );

    // Se não tem customer_id, criar um primeiro
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      console.log('🆕 Criando customer no Stripe...');

      const stripeCustomer = await stripe.customers.create({
        name: user.name,
        email: user.email,
        metadata: { user_id: user.id.toString() }
      });

      customerId = stripeCustomer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripe_customer_id: customerId }
      });

      console.log(`✅ Customer criado: ${customerId}`);
    }

    // Criar cupom
    console.log('🎫 Criando cupom de 100% de desconto...');

    const coupon = await stripe.coupons.create({
      id: 'DESCONTO100',
      percent_off: 100,
      duration: 'once',
      max_redemptions: 1,
      metadata: {
        created_by: 'admin',
        created_at: new Date().toISOString(),
        user_id: user.id.toString()
      }
    });

    console.log(`✅ Cupom criado: ${coupon.id}`);

    // Criar código promocional específico para o usuário
    console.log('🔑 Criando código promocional específico...');

    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: 'DESCONTO100',
      customer: customerId, // ✅ ESPECÍFICO PARA ESTE CUSTOMER
      max_redemptions: 1,
      metadata: {
        created_by: 'admin',
        created_at: new Date().toISOString(),
        user_id: user.id.toString(),
        user_email: user.email
      }
    });

    console.log(`✅ Código promocional criado: ${promotionCode.code}`);
    console.log(`👤 Limitado ao customer: ${customerId}`);
    console.log(`📧 Email do usuário: ${user.email}`);

    console.log('\n🎯 RESUMO:');
    console.log(`   Cupom: ${coupon.id}`);
    console.log(`   Código: ${promotionCode.code}`);
    console.log(`   Customer: ${customerId}`);
    console.log(`   Desconto: 100%`);
    console.log(`   Limite: 1 uso`);
    console.log(`   Específico para: ${user.email}`);

    console.log('\n✅ Cupom criado com sucesso!');
    console.log(
      '💡 Agora o usuário pode usar o código DESCONTO100 no checkout'
    );
  } catch (error) {
    if (error.code === 'resource_already_exists') {
      console.log('⚠️  Cupom ou código já existe. Atualizando...');

      // Buscar o cupom existente
      const existingCoupon = await stripe.coupons.retrieve('DESCONTO100');
      console.log(`✅ Cupom já existe: ${existingCoupon.id}`);

      // Buscar códigos promocionais existentes
      const existingCodes = await stripe.promotionCodes.list({
        code: 'DESCONTO100',
        limit: 1
      });

      if (existingCodes.data.length > 0) {
        console.log(
          `✅ Código promocional já existe: ${existingCodes.data[0].code}`
        );
        console.log(
          `👤 Customer associado: ${existingCodes.data[0].customer || 'Nenhum'}`
        );
      }
    } else {
      console.error('❌ Erro ao criar cupom:', error.message);
    }
  }
}

// Executar o script
createUserSpecificCoupon();
