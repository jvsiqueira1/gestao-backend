const express = require('express');
const { testarEnvioRelatorios } = require('../cron/lamina_cron');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

// Rota para testar o envio de relatórios (apenas para desenvolvimento)
router.post('/testar-envio', authMiddleware, async (req, res) => {
  try {
    // Verificar se é um usuário admin (opcional)
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Acesso negado' });
    // }
    
    // Executar o teste
    await testarEnvioRelatorios();
    
    res.json({ 
      success: true, 
      message: 'Teste de envio de relatórios executado com sucesso. Verifique os logs do servidor.' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao executar teste de envio de relatórios',
      details: error.message 
    });
  }
});

module.exports = router; 