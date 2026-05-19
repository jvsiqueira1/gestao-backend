require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json());

const authRoutes = require('./routes/auth.route');
app.use('/api/auth', authRoutes);

const protectedRoutes = require('./routes/protected');
app.use('/api/protected', protectedRoutes);

const financeRoutes = require('./routes/finance.route');
app.use('/api/finance', financeRoutes);

const categoryRoutes = require('./routes/category.route');
app.use('/api/category', categoryRoutes);

const goalRoutes = require('./routes/goal');
app.use('/api/goal', goalRoutes);

const fixedExpensesRoutes = require('./routes/fixed-expenses');
app.use('/api/fixed-expenses', fixedExpensesRoutes);

const fixedIncomesRoutes = require('./routes/fixed-incomes');
app.use('/api/fixed-incomes', fixedIncomesRoutes);

app.get('/', (req, res) => {
  res.send('API de Gestão de Gastos Pessoais rodando!');
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
