const prismaService = require('./prisma.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const defaultCategories = require('../utils/default_categories');

class AuthService {
  constructor() {
    this.prisma = prismaService.getClient();
  }

  isOwnerEmail(email) {
    return !process.env.OWNER_EMAIL || email === process.env.OWNER_EMAIL;
  }

  async requestPasswordReset(email) {
    if (!email) throw new Error('E-mail é obrigatório.');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'Se o e-mail existir, enviaremos instruções.' };
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt }
    });
    const resetUrl = `${process.env.FRONTEND_URL}/trocar-senha?token=${token}`;
    console.log(`[reset-password] Link para ${user.email}: ${resetUrl}`);
    return {
      message: 'Se o e-mail existir, enviaremos instruções.',
      ...(process.env.NODE_ENV !== 'production' ? { dev_reset_url: resetUrl } : {})
    };
  }

  async resetPassword(token, password) {
    if (!token || !password) throw new Error('Token e nova senha são obrigatórios.');
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new Error('Token inválido ou expirado.');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: passwordHash }
    });
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } });
    return { message: 'Senha alterada com sucesso.' };
  }

  async registerUser(userData) {
    const { name, email, password } = userData;
    if (!name || !email || !password) {
      throw new Error('Nome, email e senha são obrigatórios.');
    }
    if (!this.isOwnerEmail(email)) {
      const err = new Error('Cadastro restrito.');
      err.code = 'FORBIDDEN';
      throw err;
    }
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) throw new Error('Email já cadastrado.');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { name, email, password: passwordHash },
      select: { id: true, name: true, email: true }
    });

    await this.prisma.category.createMany({
      data: defaultCategories.map((c) => ({ ...c, user_id: user.id })),
      skipDuplicates: true
    });

    return user;
  }

  async loginUser(email, password) {
    if (!email || !password) throw new Error('Email e senha são obrigatórios.');
    if (!this.isOwnerEmail(email)) {
      const err = new Error('Credenciais inválidas.');
      err.code = 'FORBIDDEN';
      throw err;
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw new Error('Credenciais inválidas.');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Credenciais inválidas.');

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return { token };
  }

  async getCurrentUser(userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, created_at: true }
    });
    if (!user) throw new Error('Usuário não encontrado.');
    return { user };
  }
}

module.exports = new AuthService();
