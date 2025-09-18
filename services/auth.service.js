const prismaService = require('./prisma.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

class AuthService {
  constructor() {
    this.prisma = prismaService.getClient();
  }

  async sendWelcomeEmail(to, nome) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_PASS
      }
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
            <a href="${process.env.FRONTEND_URL}/perfil" style="display: inline-block; background: #0e7490; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 1.1em; margin-bottom: 16px;">Acessar Perfil</a>
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
      `
    });
  }

  async sendPasswordResetEmail(to, nome, token) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_PASS
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL}/trocar-senha?token=${token}`;

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
      `
    });
  }

  async requestPasswordReset(email) {
    if (!email) {
      throw new Error('E-mail é obrigatório.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Por segurança, não revelar se o e-mail existe ou não
      return {
        message:
          'Se o e-mail existir, enviaremos instruções para redefinir a senha.'
      };
    }

    // Gerar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar token no banco
    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    });

    // Enviar e-mail
    await this.sendPasswordResetEmail(user.email, user.name, token);
    return {
      message:
        'Se o e-mail existir, enviaremos instruções para redefinir a senha.'
    };
  }

  async resetPassword(token, password) {
    if (!token || !password) {
      throw new Error('Token e nova senha são obrigatórios.');
    }

    // Buscar token no banco
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token }
    });
    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new Error('Token inválido ou expirado.');
    }

    // Atualizar senha do usuário
    const password_hash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: password_hash }
    });

    // Deletar todos os tokens desse usuário
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId }
    });
    return { message: 'Senha alterada com sucesso.' };
  }

  async registerUser(userData) {
    const { name, email, password } = userData;

    if (!name || !email || !password) {
      throw new Error('Nome, email e senha são obrigatórios.');
    }

    const userExists = await this.prisma.user.findUnique({
      where: { email }
    });

    if (userExists) {
      throw new Error('Email já cadastrado.');
    }

    const password_hash = await bcrypt.hash(password, 10);
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const user = await this.prisma.user.create({
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
    await this.prisma.user.update({
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

    await this.prisma.category.createMany({
      data: defaultCategories.map(cat => ({
        name: cat.name,
        type: cat.type,
        user_id: user.id
      })),
      skipDuplicates: true
    });

    await this.sendWelcomeEmail(user.email, user.name);
    return user;
  }

  async loginUser(email, password) {
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Credenciais inválidas.');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Credenciais inválidas.');
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });
    return { token };
  }

  async getCurrentUser(userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
      throw new Error('Usuário não encontrado.');
    }

    return { user };
  }
}

module.exports = new AuthService();
