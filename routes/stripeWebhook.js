const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER, 
    pass: process.env.ZOHO_PASS, 
  },
});

async function sendTrialExpiringEmail(to, nome, trialEndDate) {
  await transporter.sendMail({
    from: `"Gestão de Gastos" <${process.env.ZOHO_USER}>`,
    to,
    subject: 'Seu período de teste está acabando!',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 32px; color: #222;">
        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px;">
          <h2 style="color: #0e7490; margin-bottom: 16px;">Olá, ${nome}!</h2>
          <p style="font-size: 1.1em; margin-bottom: 16px;">Seu <b>período de teste</b> termina em <b style='color:#eab308;'>${trialEndDate}</b>.</p>
          <p style="margin-bottom: 24px;">Para continuar aproveitando todos os recursos premium do <b>Gestão de Gastos</b>, faça sua assinatura agora mesmo e não perca o acesso ao dashboard, relatórios, exportação de dados e muito mais!</p>
          <a href="https://gestao.jvsdev.com.br/profile" style="display: inline-block; background: #0e7490; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 1.1em; margin-bottom: 16px;">Regularizar Assinatura</a>
          <ul style="margin: 32px 0 16px 0; padding: 0; list-style: none;">
            <li style="margin-bottom: 8px;"><span style="color: #22c55e; font-weight: bold;">✓</span> Dashboard completo</li>
            <li style="margin-bottom: 8px;"><span style="color: #22c55e; font-weight: bold;">✓</span> Categorização de despesas</li>
            <li style="margin-bottom: 8px;"><span style="color: #22c55e; font-weight: bold;">✓</span> Relatórios detalhados</li>
            <li style="margin-bottom: 8px;"><span style="color: #22c55e; font-weight: bold;">✓</span> Exportação de dados</li>
            <li style="margin-bottom: 8px;"><span style="color: #22c55e; font-weight: bold;">✓</span> Suporte prioritário</li>
          </ul>
          <p style="font-size: 0.95em; color: #666; margin-top: 24px;">Dúvidas? Responda este e-mail ou acesse o perfil para suporte.</p>
          <div style="margin-top: 32px; text-align: center; color: #aaa; font-size: 0.9em;">Equipe Gestão de Gastos</div>
        </div>
      </div>
    `,
  });
}

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
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object;
        console.log('customer.subscription.trial_will_end - subscription:', subscription);
        // Buscar usuário pelo stripe_customer_id
        const user = await prisma.user.findFirst({
          where: { stripe_customer_id: subscription.customer },
        });
        if (user) {
          const trialEnd = new Date(subscription.trial_end * 1000).toLocaleDateString('pt-BR');
          try {
            await sendTrialExpiringEmail(user.email, user.name, trialEnd);
            console.log('E-mail de trial expirando enviado para', user.email);
          } catch (err) {
            console.error('Erro ao enviar e-mail de trial expirando:', err);
          }
        }
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