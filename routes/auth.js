const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Debug das importações
console.log('=== DEBUG IMPORTAÇÕES ===');
console.log('Express carregado:', !!express);
console.log('Prisma carregado:', !!prisma);
console.log('Prisma client disponível:', !!(prisma && prisma.user));
console.log('PasswordResetToken disponível:', !!(prisma && prisma.passwordResetToken));

const router = express.Router();

async function sendWelcomeEmail(to, nome) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_USER,
      pass: process.env.ZOHO_PASS,
    },
  });
  
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
          <a href="https://gestao.jvsdev.com.br/perfil" style="display: inline-block; background: #0e7490; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 1.1em; margin-bottom: 16px;">Acessar Perfil</a>
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

// Função para enviar e-mail de recuperação de senha
async function sendPasswordResetEmail(to, nome, token) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_USER,
      pass: process.env.ZOHO_PASS,
    },
  });
  
  const isDev = process.env.NODE_ENV !== 'production';
  const resetUrl = isDev
    ? `http://localhost:3000/trocar-senha?token=${token}`
    : `https://gestao.jvsdev.com.br/trocar-senha?token=${token}`;
  await transporter.sendMail({
    from: `"Gestão de Gastos" <${process.env.ZOHO_USER}>`,
    to,
    subject: 'Recuperação de senha - Gestão de Gastos',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 32px; color: #222;">
        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px;">
          <h2 style="color: #0e7490; margin-bottom: 16px;">Olá, ${nome}!</h2>
          <p style="font-size: 1.1em; margin-bottom: 16px;">Recebemos uma solicitação para redefinir sua senha no <b>Gestão de Gastos</b>.</p>
          <p style="margin-bottom: 24px;">Clique no botão abaixo para criar uma nova senha. O link é válido por 1 hora.</p>
          <a href="${resetUrl}" style="display: inline-block; background: #0e7490; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 1.1em; margin-bottom: 16px;">Trocar senha</a>
          <p style="font-size: 0.95em; color: #666; margin-top: 24px;">Se você não solicitou, ignore este e-mail.</p>
          <div style="margin-top: 32px; text-align: center; color: #aaa; font-size: 0.9em;">Equipe Gestão de Gastos</div>
        </div>
      </div>
    `,
  });
}

// Endpoint para solicitar recuperação de senha
router.post('/esqueci-senha', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }
  
  console.log('=== DEBUG ESQUECI-SENHA ===');
  console.log('Email recebido:', email);
  console.log('Prisma disponível:', !!prisma);
  console.log('Prisma.passwordResetToken disponível:', !!(prisma && prisma.passwordResetToken));
  
  try {
    console.log('1. Buscando usuário...');
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('Usuário não encontrado');
      // Por segurança, não revelar se o e-mail existe ou não
      return res.status(200).json({ message: 'Se o e-mail existir, enviaremos instruções para redefinir a senha.' });
    }
    console.log('Usuário encontrado:', user.name);
    
    // Gerar token seguro
    console.log('2. Gerando token...');
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    console.log('Token gerado:', token);
    
    // Salvar token no banco
    console.log('3. Salvando token no banco...');
    console.log('Dados para salvar:', { token, userId: user.id, expiresAt });
    
    const savedToken = await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      }
    });
    console.log('Token salvo:', savedToken);
    
    // Enviar e-mail
    console.log('4. Enviando email...');
    await sendPasswordResetEmail(user.email, user.name, token);
    console.log('Email enviado com sucesso');
    
    return res.status(200).json({ message: 'Se o e-mail existir, enviaremos instruções para redefinir a senha.' });
  } catch (err) {
    console.error('Erro ao solicitar recuperação de senha:', err);
    console.error('Stack trace:', err.stack);
    console.error('Prisma error details:', err.message);
    res.status(500).json({ error: 'Erro ao solicitar recuperação de senha.' });
  }
});

// Endpoint para trocar a senha usando o token
router.post('/trocar-senha', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
  }
  try {
    // Buscar token no banco
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }
    // Atualizar senha do usuário
    const password_hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: password_hash }
    });
    // Deletar todos os tokens desse usuário (opcional: só o usado)
    await prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } });
    return res.status(200).json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('Erro ao trocar senha:', err);
    res.status(500).json({ error: 'Erro ao trocar senha.' });
  }
});

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

    await prisma.category.createMany({
      data: defaultCategories.map(cat => ({
        name: cat.name,
        type: cat.type,
        user_id: user.id
      })),
      skipDuplicates: true
    });
    
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