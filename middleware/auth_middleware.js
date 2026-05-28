const jwt = require('jsonwebtoken');
const prismaService = require('../services/prisma.service');

async function authenticate(req, res, next) {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    return res.status(401).json({ error: 'Token malformado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const prisma = prismaService.getClient();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, created_at: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    if (process.env.OWNER_EMAIL && user.email !== process.env.OWNER_EMAIL) {
      return res.status(403).json({ error: 'Acesso restrito.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

const rlsMiddleware = require('./rls_middleware');

module.exports = authenticate;
module.exports.requireAuth = authenticate;
// Combo: autentica + abre transação RLS com SET LOCAL app.current_user_id.
// Usar em todas as rotas que tocam tabelas com RLS habilitada.
module.exports.requireAuthWithRls = [authenticate, rlsMiddleware];
