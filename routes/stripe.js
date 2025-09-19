const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prismaService = require('../services/prisma.service');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

// Criar checkout session para assinatura
router.post(
  '/create-checkout-session',
  authMiddleware.requireAuth,
  async (req, res) => {
    try {
      // Buscar stripe_customer_id do usuário
      const prisma = prismaService.getClient();
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Se não tem stripe_customer_id, criar um
      let customerId = user.stripe_customer_id;

      if (!customerId) {
        const stripeCustomer = await stripe.customers.create({
          name: user.name,
          email: user.email,
          metadata: { user_id: user.id.toString() }
        });

        customerId = stripeCustomer.id;

        // Atualizar o usuário com o novo stripe_customer_id
        await prisma.user.update({
          where: { id: user.id },
          data: { stripe_customer_id: customerId }
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: 'Plano Mensal - Gestão de Gastos',
                description:
                  'Acesso completo ao sistema de gestão de gastos pessoais'
              },
              unit_amount: 1990, // R$ 19,90 em centavos
              recurring: {
                interval: 'month'
              }
            },
            quantity: 1
          }
        ],
        mode: 'subscription',
        allow_promotion_codes: true,
        customer: customerId, // ✅ USAR O CUSTOMER EXISTENTE
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/perfil?success=true`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/perfil?canceled=true`,
        metadata: {
          user_id: req.user.id.toString()
        }
      });

      res.json({
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('Erro ao criar checkout session:', error);
      res.status(500).json({ error: 'Erro ao criar sessão de pagamento' });
    }
  }
);

// Endpoint para checkout anual
router.post(
  '/checkout-annual',
  authMiddleware.requireAuth,
  async (req, res) => {
    const { success_url, cancel_url } = req.body;
    try {
      // Buscar stripe_customer_id do usuário
      const prisma = prismaService.getClient();
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Se não tem stripe_customer_id, criar um
      let customerId = user.stripe_customer_id;

      if (!customerId) {
        const stripeCustomer = await stripe.customers.create({
          name: user.name,
          email: user.email,
          metadata: { user_id: user.id.toString() }
        });

        customerId = stripeCustomer.id;

        // Atualizar o usuário com o novo stripe_customer_id
        await prisma.user.update({
          where: { id: user.id },
          data: { stripe_customer_id: customerId }
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: 'Assinatura Anual',
                description: 'Acesso premium por 12 meses'
              },
              unit_amount: 15000 // R$150,00 em centavos
            },
            quantity: 1
          }
        ],
        allow_promotion_codes: true,
        customer: customerId, // ✅ USAR O CUSTOMER EXISTENTE
        success_url:
          success_url ||
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pagamento/sucesso`,
        cancel_url:
          cancel_url ||
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pagamento/cancelado`,
        metadata: {
          user_id: req.user.id.toString()
        }
      });
      res.json({ url: session.url });
    } catch (err) {
      console.error('Erro ao criar checkout anual:', err);
      res.status(500).json({ error: 'Erro ao criar checkout anual.' });
    }
  }
);

// Webhook para processar eventos do Stripe
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error('Erro no webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        switch (event.type) {
          case 'checkout.session.completed':
            const session = event.data.object;
            if (session.mode === 'subscription') {
              // Calcular premium_until baseado no tipo de plano
              const premiumUntil = new Date();
              if (session.amount_total === 15000) {
                // Plano anual
                premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);
              } else {
                // Plano mensal
                premiumUntil.setMonth(premiumUntil.getMonth() + 1);
              }

              const prisma = prismaService.getClient();
              await prisma.user.update({
                where: { id: Number(session.metadata.user_id) },
                data: {
                  subscription_status: 'active',
                  stripe_customer_id: session.customer,
                  plan: session.amount_total === 15000 ? 'anual' : 'mensal',
                  premium_until: premiumUntil,
                  trial_end: null // Zerar o trial quando assina plano pago
                }
              });
            } else if (
              session.mode === 'payment' &&
              session.metadata &&
              session.metadata.user_id
            ) {
              // Libera premium anual
              const premiumUntil = new Date();
              premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);

              await prisma.user.update({
                where: { id: Number(session.metadata.user_id) },
                data: {
                  subscription_status: 'active',
                  premium_until: premiumUntil,
                  plan: 'anual',
                  trial_end: null // Zerar o trial quando assina plano pago
                }
              });
            }
            break;

          case 'customer.subscription.updated':
            const subscription = event.data.object;
            const prisma = prismaService.getClient();
            await prisma.user.updateMany({
              where: { stripe_customer_id: subscription.customer },
              data: { subscription_status: subscription.status }
            });
            break;

          case 'customer.subscription.deleted':
            const deletedSubscription = event.data.object;
            const prisma2 = prismaService.getClient();
            await prisma2.user.updateMany({
              where: { stripe_customer_id: deletedSubscription.customer },
              data: { subscription_status: 'canceled' }
            });
            break;

          case 'invoice.payment_failed':
            const invoice = event.data.object;
            const prisma3 = prismaService.getClient();
            await prisma3.user.updateMany({
              where: { stripe_customer_id: invoice.customer },
              data: { subscription_status: 'past_due' }
            });
            break;
        }

        res.json({ received: true });
      } catch (error) {
        console.error('Erro ao processar webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    } catch (error) {
      console.error('Erro geral no webhook:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Cancelar assinatura Stripe
router.post('/cancel-subscription', authMiddleware, async (req, res) => {
  try {
    // Buscar o stripe_customer_id do usuário
    const prisma = prismaService.getClient();
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.stripe_customer_id) {
      return res
        .status(400)
        .json({ error: 'Usuário não possui assinatura ativa.' });
    }

    // Buscar subscription ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'all',
      limit: 1
    });
    if (!subscriptions.data.length) {
      return res.status(400).json({ error: 'Nenhuma assinatura encontrada.' });
    }

    const subscription = subscriptions.data[0];
    const subscriptionId = subscription.id;

    // Verificar se a subscription já foi cancelada
    if (subscription.status === 'canceled') {
    } else {
      // Para assinatura mensal, o usuário tem acesso até o final do período atual
      // O Stripe automaticamente cancela no final do período atual
      await stripe.subscriptions.cancel(subscriptionId);
    }

    // Calcular data de expiração (até o final do período atual)

    let currentPeriodEnd;

    // Tentar diferentes campos para obter a data de expiração
    if (
      subscription.items &&
      subscription.items.data &&
      subscription.items.data[0] &&
      subscription.items.data[0].current_period_end
    ) {
      // Para subscriptions canceladas, usar o current_period_end do item
      currentPeriodEnd = new Date(
        subscription.items.data[0].current_period_end * 1000
      );
    } else if (subscription.current_period_end) {
      currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    } else if (subscription.ended_at) {
      currentPeriodEnd = new Date(subscription.ended_at * 1000);
    } else if (subscription.canceled_at) {
      // Se foi cancelado, adicionar 30 dias a partir da data de cancelamento
      currentPeriodEnd = new Date(subscription.canceled_at * 1000);
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
    } else {
      currentPeriodEnd = new Date();
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
    }

    // Validar se a data é válida
    if (isNaN(currentPeriodEnd.getTime())) {
      currentPeriodEnd = new Date();
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
    }

    const prisma4 = prismaService.getClient();
    const _updatedUser = await prisma4.user.update({
      where: { id: req.user.id },
      data: {
        subscription_status: 'canceled',
        premium_until: currentPeriodEnd,
        plan: 'mensal'
      }
    });

    res.json({
      success: true,
      message:
        'Assinatura mensal cancelada. Você continuará com acesso premium até o final do período atual.',
      premium_until: currentPeriodEnd
    });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura.' });
  }
});

// Cancelar plano anual
router.post('/cancel-annual', authMiddleware.requireAuth, async (req, res) => {
  try {
    const prisma5 = prismaService.getClient();
    const user = await prisma5.user.findUnique({ where: { id: req.user.id } });

    if (
      !user ||
      user.subscription_status !== 'active' ||
      user.plan !== 'anual'
    ) {
      return res
        .status(400)
        .json({ error: 'Usuário não possui plano anual ativo.' });
    }

    // Para plano anual, apenas marca como cancelado mas mantém acesso até premium_until
    const _updatedUser = await prisma5.user.update({
      where: { id: req.user.id },
      data: {
        subscription_status: 'canceled'
        // Não altera plan nem premium_until - mantém acesso até a data de expiração
      }
    });

    res.json({
      success: true,
      message:
        'Plano anual cancelado. Você continuará com acesso premium até o final do período pago.',
      premium_until: user.premium_until
    });
  } catch (error) {
    console.error('Erro ao cancelar plano anual:', error);
    res.status(500).json({ error: 'Erro ao cancelar plano anual.' });
  }
});

module.exports = router;
