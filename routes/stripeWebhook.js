const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');

// Webhook para processar eventos do Stripe
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
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
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          if (!session.metadata || !session.metadata.user_id) {
            console.error('user_id ausente em session.metadata');
            return res.status(400).json({ error: 'user_id ausente em session.metadata' });
          }
          const result = await prisma.user.update({
            where: { id: Number(session.metadata.user_id) },
            data: {
              subscription_status: 'active',
              stripe_customer_id: session.customer,
              plan: 'PREMIUM'
            }
          });
          // Gerar novo JWT
          const token = jwt.sign({ userId: Number(session.metadata.user_id) }, process.env.JWT_SECRET, { expiresIn: '1d' });
          return res.json({ received: true, token });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const updateResult = await prisma.user.updateMany({
          where: { stripe_customer_id: subscription.customer },
          data: {
            subscription_status: subscription.status,
            plan: subscription.status === 'active' ? 'PREMIUM' : 'TRIAL'
          }
        });
        // Se ficou active, gere novo JWT para o primeiro usuário encontrado
        if (subscription.status === 'active') {
          const user = await prisma.user.findFirst({ where: { stripe_customer_id: subscription.customer } });
          if (user) {
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.json({ received: true, token });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const deletedSubscription = event.data.object;
        const delResult = await prisma.user.updateMany({
          where: { stripe_customer_id: deletedSubscription.customer },
          data: {
            subscription_status: 'canceled',
            plan: 'TRIAL'
          }
        });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const failResult = await prisma.user.updateMany({
          where: { stripe_customer_id: invoice.customer },
          data: {
            subscription_status: 'past_due',
            plan: 'TRIAL'
          }
        });
        break;
      }
      default: {
        // Retorne 200 para eventos não tratados
        return res.status(200).json({ received: true });
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 