const puppeteer = require('puppeteer');

async function generatePDFFromHTML(htmlContent) {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Configurar viewport para melhor renderização
  await page.setViewport({ width: 900, height: 1200 });
  
  // Carregar o HTML
  await page.setContent(htmlContent, { 
    waitUntil: 'networkidle0',
    timeout: 30000 
  });
  
  // Aguardar um pouco para garantir que tudo foi renderizado
  await page.waitForTimeout(1000);
  
  // Gerar PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 24, bottom: 24, left: 24, right: 24 }
  });
  
  await browser.close();
  return pdfBuffer;
}

module.exports = { generatePDFFromHTML }; 