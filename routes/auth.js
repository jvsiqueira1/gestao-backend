const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Registro de usuário
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
    console.error('Erro detalhado ao fazer login: ', err);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

// Novo endpoint: retorna dados do usuário autenticado, sem checar status de assinatura
router.get('/me', async (req, res) => {
  try {
    // Extrai token do header
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
    res.status(401).json({ error: 'Token inválido.' });
  }
});

module.exports = router; 