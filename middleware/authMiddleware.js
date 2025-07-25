const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

module.exports = async function (req, res, next) {
  let token;

  // Tenta pegar do header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Se não veio no header, tenta pegar do cookie
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  // Checagem extra: token deve ser um JWT válido (3 partes separadas por ponto)
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    return res.status(401).json({ error: 'Token malformado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        subscription_status: true,
        trial_end: true,
        created_at: true,
        plan: true
        // premium_until removido
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    
    const now = new Date();
    
    // Lógica simplificada de verificação de acesso:
    // 1. Assinatura ativa = acesso garantido
    // 2. Trial válido = acesso garantido
    // 3. Plano TRIAL = acesso garantido
    
    const hasActiveSubscription = user.subscription_status === 'active';
    const hasValidTrial = user.trial_end && new Date(user.trial_end) > now;
    const hasTrialPlan = user.plan === 'TRIAL';
    
    // Verificar se tem acesso
    if (hasActiveSubscription || hasValidTrial || hasTrialPlan) {
      req.user = user;
      next();
    } else {
      return res.status(402).json({ error: 'Assinatura expirada ou trial encerrado.' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

// Novo middleware: só autentica, não checa assinatura
module.exports.requireAuth = async function (req, res, next) {
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
    const userId = decoded.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        subscription_status: true,
        trial_end: true,
        created_at: true,
        plan: true
        // premium_until removido
      }
    });
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido.' });
  }
}; 