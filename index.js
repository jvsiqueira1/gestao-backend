require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

const contactRoutes = require('./routes/contact');
app.use('/api/contact', contactRoutes);

app.get('/', (req, res) => {
  res.send('API de Gestão de Gastos Pessoais rodando!');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
