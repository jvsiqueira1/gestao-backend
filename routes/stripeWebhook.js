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

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.amount_total === 15000 && session.customer_email) {
      // Liberar premium anual para o usuário com esse email
      const user = await prisma.user.findUnique({ where: { email: session.customer_email } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscription_status: 'active',
            plan: 'anual'
          }
        });
      }
    }
  }

  res.json({ received: true });
});

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
          
          // Calcular premium_until baseado no tipo de plano
          const premiumUntil = new Date();
          if (session.amount_total === 15000) {
            // Plano anual
            premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);
          } else {
            // Plano mensal
            premiumUntil.setMonth(premiumUntil.getMonth() + 1);
          }
          
          const result = await prisma.user.update({
            where: { id: Number(session.metadata.user_id) },
            data: {
              subscription_status: 'active',
              stripe_customer_id: session.customer,
              plan: session.amount_total === 15000 ? 'anual' : 'mensal',
              premium_until: premiumUntil,
              trial_end: null // Zerar o trial quando assina plano pago
            }
          });
          const token = jwt.sign({ userId: Number(session.metadata.user_id) }, process.env.JWT_SECRET, { expiresIn: '1d' });
          return res.json({ received: true, token });
        } else if (session.mode === 'payment' && session.amount_total === 15000 && session.customer_email) {
          // Liberar premium anual para o usuário com esse email
          const user = await prisma.user.findUnique({ where: { email: session.customer_email } });
          if (user) {
            const premiumUntil = new Date();
            premiumUntil.setFullYear(premiumUntil.getFullYear() + 1); // 12 meses a partir de agora
            
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscription_status: 'active',
                premium_until: premiumUntil,
                plan: 'anual',
                trial_end: null // Zerar o trial quando assina plano pago
              }
            });
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // Buscar o usuário para obter informações atuais
        const user = await prisma.user.findFirst({ 
          where: { stripe_customer_id: subscription.customer } 
        });
        
        if (user) {
          let updateData = {
            subscription_status: subscription.status
          };
          
          // Se a subscription ficou ativa, zerar o trial e definir premium_until
          if (subscription.status === 'active') {
            updateData.trial_end = null; // Zerar o trial
            
            // Calcular premium_until baseado no current_period_end
            if (subscription.current_period_end) {
              updateData.premium_until = new Date(subscription.current_period_end * 1000);
            }
            
            // Definir o plano baseado no valor (se disponível)
            if (subscription.items && subscription.items.data.length > 0) {
              const item = subscription.items.data[0];
              if (item.price && item.price.unit_amount) {
                updateData.plan = item.price.unit_amount === 15000 ? 'anual' : 'mensal';
              }
            }
          }
          
          await prisma.user.update({
            where: { id: user.id },
            data: updateData
          });
          
          // Se ficou active, gere novo JWT
          if (subscription.status === 'active') {
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.json({ received: true, token });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const deletedSubscription = event.data.object;
        // Buscar o usuário para saber o plano atual
        const user = await prisma.user.findFirst({
          where: { stripe_customer_id: deletedSubscription.customer },
        });

        if (user) {
          // Manter o plano atual e premium_until, apenas marcar como cancelado
          // O usuário terá acesso até premium_until
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscription_status: 'canceled'
              // Não altera plan nem premium_until - mantém acesso até a data de expiração
            }
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const failResult = await prisma.user.updateMany({
          where: { stripe_customer_id: invoice.customer },
          data: {
            subscription_status: 'past_due'
            // Não altera plan nem premium_until - mantém acesso até resolver o pagamento
          }
        });
        break;
      }
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object;
        // Buscar usuário pelo stripe_customer_id
        const user = await prisma.user.findFirst({
          where: { stripe_customer_id: subscription.customer },
        });
        if (user) {
          const trialEnd = new Date(subscription.trial_end * 1000).toLocaleDateString('pt-BR');
          try {
            await sendTrialExpiringEmail(user.email, user.name, trialEnd);
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