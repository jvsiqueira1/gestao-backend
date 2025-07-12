require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar o cron job para relatórios mensais
require('./cron/laminaCron');

const app = express();
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL, 
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sem origin (ex: mobile, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Middleware para logar todas as requisições
app.use((req, res, next) => {
  next();
});

const stripeWebhook = require('./routes/stripeWebhook');
app.use('/api/stripe/webhook', stripeWebhook);

app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const protectedRoutes = require('./routes/protected');
app.use('/api/protected', protectedRoutes);

const financeRoutes = require('./routes/finance-prisma');
app.use('/api/finance', financeRoutes);

const categoryRoutes = require('./routes/category');
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
app.listen(PORT, () => {
  // Servidor iniciado com sucesso
});
