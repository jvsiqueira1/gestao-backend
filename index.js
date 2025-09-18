require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar o cron job para relatórios mensais
require('./cron/lamina_cron');

const app = express();
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  '*' // Permite qualquer origem para desenvolvimento
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requests sem origin (ex: mobile, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))
        return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// Middleware para logar todas as requisições
app.use((req, res, next) => {
  next();
});

const stripeWebhook = require('./routes/stripeWebhook');
app.use('/api/stripe/webhook', stripeWebhook);

app.use(express.json());

const authRoutes = require('./routes/auth.route');
app.use('/api/auth', authRoutes);

const protectedRoutes = require('./routes/protected');
app.use('/api/protected', protectedRoutes);

const financeRoutes = require('./routes/finance.route');
app.use('/api/finance', financeRoutes);

const categoryRoutes = require('./routes/category.route');
app.use('/api/category', categoryRoutes);

const stripeRoutes = require('./routes/stripe');
app.use('/api/stripe', stripeRoutes);

const goalRoutes = require('./routes/goal');
app.use('/api/goal', goalRoutes);

const contactRoutes = require('./routes/contact');
app.use('/api/contact', contactRoutes);

const laminaRoutes = require('./routes/lamina');
app.use('/api/lamina', laminaRoutes);

const fixedExpensesRoutes = require('./routes/fixed-expenses');
app.use('/api/fixed-expenses', fixedExpensesRoutes);

const fixedIncomesRoutes = require('./routes/fixed-incomes');
app.use('/api/fixed-incomes', fixedIncomesRoutes);

app.get('/', (req, res) => {
  res.send('API de Gestão de Gastos Pessoais rodando!');
});

const PORT = process.env.PORT || 4000;

// Iniciar servidor com indicativos visuais
app.listen(PORT, () => {
  console.log('\n🚀 ===========================================');
  console.log('   SERVIDOR BACKEND INICIADO COM SUCESSO!');
  console.log('===========================================');
  console.log(`📋 Status: Online e funcionando`);
  console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  console.log('===========================================\n');
});
