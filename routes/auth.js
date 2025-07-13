const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASS,
  },
});

async function sendWelcomeEmail(to, nome) {
  await transporter.sendMail({
    from: `"Gestão de Gastos" <${process.env.ZOHO_USER}>`,
    to,
    subject: 'Bem-vindo ao Gestão de Gastos!',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 32px; color: #222;">
        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px;">
          <h2 style="color: #0e7490; margin-bottom: 16px;">Olá, ${nome}!</h2>
          <p style="font-size: 1.1em; margin-bottom: 16px;">Sua conta foi criada com sucesso no <b>Gestão de Gastos</b>!</p>
          <p style="margin-bottom: 24px;">Aproveite o período de teste gratuito para conhecer todos os recursos premium: dashboard, relatórios, exportação de dados e muito mais.</p>
          <a href="https://gestao.jvsdev.com.br/profile" style="display: inline-block; background: #0e7490; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 1.1em; margin-bottom: 16px;">Acessar Perfil</a>
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

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }
  try {
    const userExists = await prisma.user.findUnique({
      where: { email }
    });
    
    if (userExists) {
      return res.status(409).json({ error: 'Email já cadastrado.' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: password_hash,
        subscription_status: 'trialing',
        trial_end: trialEnd,
        plan: 'free'
      },
      select: {
        id: true,
        name: true,
        email: true,
        subscription_status: true,
        trial_end: true,
        plan: true
      }
    });
    
    // Cria o cliente no Stripe
    const stripeCustomer = await stripe.customers.create({
      name,
      email,
      metadata: { user_id: user.id.toString() }
    });
    
    // Atualiza o usuário com o stripe_customer_id
    await prisma.user.update({
      where: { id: user.id },
      data: { stripe_customer_id: stripeCustomer.id }
    });
    
    // Inserir categorias padrão para o novo usuário
    const defaultCategories = [
      { name: 'Salário', type: 'income' },
      { name: 'Freelance', type: 'income' },
      { name: 'Investimento', type: 'income' },
      { name: 'Outros', type: 'income' },
      { name: 'Alimentação', type: 'expense' },
      { name: 'Transporte', type: 'expense' },
      { name: 'Moradia', type: 'expense' },
      { name: 'Lazer', type: 'expense' },
      { name: 'Saúde', type: 'expense' },
      { name: 'Educação', type: 'expense' },
      { name: 'Outros', type: 'expense' }
    ];
    
    const insertPromises = defaultCategories.map(cat =>
      prisma.category.upsert({
        where: {
          user_id_name: {
            user_id: user.id,
            name: cat.name
          }
        },
        update: {},
        create: {
          name: cat.name,
          type: cat.type,
          user_id: user.id
        }
      })
    );
    
    await Promise.all(insertPromises);
    
    await sendWelcomeEmail(user.email, user.name);
    
    res.status(201).json(user);
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});

// Login de usuário
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ token });
  } catch (err) {
    console.error('❌ Erro detalhado ao fazer login: ', err);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

// Novo endpoint: retorna dados do usuário autenticado, sem checar status de assinatura
router.get('/me', authMiddleware.requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        subscription_status: true,
        trial_end: true,
        created_at: true,
        plan: true
      }
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Erro ao buscar dados do usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router; 