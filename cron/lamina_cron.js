const cron = require('node-cron');
const { enviarRelatoriosMensais } = require('../services/lamina_email_service');

// Executa todo dia 01 às 8h da manhã
cron.schedule('0 8 1 * *', async () => {
  try {
    await enviarRelatoriosMensais();
  } catch (error) {
    console.error('=== ERRO NO ENVIO DE RELATÓRIOS MENSAIS ===', error);
  }
});

// Função para testar manualmente (opcional)
async function testarEnvioRelatorios() {
  await enviarRelatoriosMensais();
}

module.exports = { testarEnvioRelatorios }; 