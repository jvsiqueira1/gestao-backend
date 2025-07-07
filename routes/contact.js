const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASS,
  },
});

router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    await transporter.sendMail({
      from: `"Gestão de Gastos" <${process.env.ZOHO_USER}>`,
      to: process.env.ZOHO_USER, // ou outro e-mail de suporte
      replyTo: email,
      subject: `[Contato Chatbot] ${subject}`,
      html: `
        <div>
          <b>Nome:</b> ${name}<br/>
          <b>Email:</b> ${email}<br/>
          <b>Assunto:</b> ${subject}<br/>
          <b>Mensagem:</b><br/>
          <pre style="font-family:inherit">${message}</pre>
        </div>
      `
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar e-mail de contato.' });
  }
});

module.exports = router; 