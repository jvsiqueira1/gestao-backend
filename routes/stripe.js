const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Criar checkout session para assinatura
router.post('/create-checkout-session', authMiddleware.requireAuth, async (req, res) => {
  try {
    // Buscar stripe_customer_id do usuário
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const customerId = user?.stripe_customer_id || null;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Plano Mensal - Gestão de Gastos',
              description: 'Acesso completo ao sistema de gestão de gastos pessoais',
            },
            unit_amount: 1990, // R$ 19,90 em centavos
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile?canceled=true`,
      customer: customerId || undefined,
      customer_email: customerId ? undefined : req.user.email,
      metadata: {
        user_id: req.user.id.toString(),
      },
    });

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Erro ao criar checkout session:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento' });
  }
});

// Webhook para processar eventos do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Erro no webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        if (session.mode === 'subscription') {
          await prisma.user.update({
            where: { id: Number(session.metadata.user_id) },
            data: {
              subscription_status: 'active',
              stripe_customer_id: session.customer
            }
          });
        }
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await prisma.user.updateMany({
          where: { stripe_customer_id: subscription.customer },
          data: { subscription_status: subscription.status }
        });
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await prisma.user.updateMany({
          where: { stripe_customer_id: deletedSubscription.customer },
          data: { subscription_status: 'canceled' }
        });
        break;

      case 'invoice.payment_failed':
        const invoice = event.data.object;
        await prisma.user.updateMany({
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
});

// Cancelar assinatura Stripe
router.post('/cancel-subscription', authMiddleware, async (req, res) => {
  try {
    // Buscar o stripe_customer_id do usuário
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'Usuário não possui assinatura ativa.' });
    }
    // Buscar subscription ativa
    const subscriptions = await stripe.subscriptions.list({ customer: user.stripe_customer_id, status: 'all', limit: 1 });
    if (!subscriptions.data.length) {
      return res.status(400).json({ error: 'Nenhuma assinatura encontrada.' });
    }
    const subscriptionId = subscriptions.data[0].id;
    await stripe.subscriptions.cancel(subscriptionId);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { subscription_status: 'canceled' }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura.' });
  }
});

module.exports = router; 