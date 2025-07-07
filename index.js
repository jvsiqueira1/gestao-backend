require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const stripeWebhook = require('./routes/stripeWebhook');
app.use('/api/stripe/webhook', stripeWebhook);

app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const protectedRoutes = require('./routes/protected');
app.use('/api/protected', protectedRoutes);

const financeRoutes = require('./routes/finance');
app.use('/api/finance', financeRoutes);

const categoryRoutes = require('./routes/category');
app.use('/api/category', categoryRoutes);

const stripeRoutes = require('./routes/stripe');
app.use('/api/stripe', stripeRoutes);

const goalRoutes = require('./routes/goal');
app.use('/api/goal', goalRoutes);

app.get('/', (req, res) => {
  res.send('API de Gestão de Gastos Pessoais rodando!');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
