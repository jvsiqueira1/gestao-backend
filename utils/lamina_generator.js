const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const getMonthName = (month) => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1];
};

function generateLaminaHTML(data, laminaData, user, selectedMonth, selectedYear) {
  // Indicadores Visuais Simples - Despesas por Categoria
  const catMap = {};
  laminaData.expenses.forEach((e) => {
    const cat = e.category_name || 'N/A';
    catMap[cat] = (catMap[cat] || 0) + parseFloat(e.value) || 0;
  });
  const total = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  
  const despesasPorCategoria = sorted.length === 0 ? 
    '<div style="color: #aaa; font-size: 14px;">Sem despesas no mês</div>' :
    sorted.map(([cat, val]) => `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 140px; font-weight: 500; color: #444; font-size: 15px;">${cat}</div>
        <div style="flex: 1; background: #f1f5f9; border-radius: 6px; height: 18px; position: relative; overflow: hidden;">
          <div style="width: ${(val / total) * 100}%; background: #dc2626; height: 100%; border-radius: 6px;"></div>
        </div>
        <div style="width: 90px; text-align: right; font-weight: 600; color: #dc2626; font-size: 15px;">${formatCurrency(val)}</div>
      </div>
    `).join('');

  // Tabela de despesas
  const despesas = laminaData.expenses;
  const tabelaDespesas = despesas.length === 0 ? 
    '<tr><td colspan="4" style="text-align: center; color: #aaa; padding: 12px;">Nenhuma despesa registrada no mês</td></tr>' :
    despesas
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((t) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(t.date).toLocaleDateString('pt-BR')}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${t.category_name || '-'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${t.description || '-'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">${formatCurrency(parseFloat(t.value))}</td>
        </tr>
      `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Lâmina Financeira</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
      <div style="background: white; color: #222; padding: 32px; width: 900px; font-family: Arial, sans-serif; border-radius: 12px; box-shadow: 0 2px 8px #0001;">
        <!-- Cabeçalho -->
        <div style="display: flex; align-items: center; margin-bottom: 24px;">
          <img src="https://seudominio.com/apple-touch-icon.png" alt="Logo Gestão de Gastos" style="width: 48px; height: 48px; margin-right: 20px; border-radius: 12px; box-shadow: 0 1px 4px #0002;" />
          <div>
            <div style="font-size: 28px; font-weight: 700;">Lâmina Financeira</div>
            <div style="font-size: 16px; color: #666;">${getMonthName(selectedMonth)}/${selectedYear} ${user?.name ? `- ${user.name}` : ''}</div>
          </div>
          <div style="flex: 1;"></div>
          <div style="font-size: 12px; color: #888; text-align: right;">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        
        <!-- Cards de visão geral -->
        <div style="display: flex; gap: 24px; margin-bottom: 32px;">
          <div style="flex: 1; background: #e0f7fa; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 1px 4px #0001;">
            <div style="font-size: 14px; color: #0891b2; margin-bottom: 4px;">Receitas</div>
            <div style="font-size: 24px; font-weight: 700; color: #0891b2;">${formatCurrency(data.monthlyIncome || 0)}</div>
          </div>
          <div style="flex: 1; background: #ffebee; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 1px 4px #0001;">
            <div style="font-size: 14px; color: #dc2626; margin-bottom: 4px;">Despesas</div>
            <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${formatCurrency(data.monthlyExpense || 0)}</div>
          </div>
          <div style="flex: 1; background: #e8f5e9; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 1px 4px #0001;">
            <div style="font-size: 14px; color: #16a34a; margin-bottom: 4px;">Saldo</div>
            <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${formatCurrency((data.monthlyIncome || 0) - (data.monthlyExpense || 0))}</div>
          </div>
        </div>
        
        <!-- Indicadores Visuais Simples - Despesas por Categoria -->
        <div style="margin-bottom: 32px;">
          <div style="font-weight: 600; font-size: 18px; margin-bottom: 12px;">Despesas por Categoria</div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${despesasPorCategoria}
          </div>
        </div>
        
        <!-- Tabela de Despesas do Mês -->
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">Despesas do Mês</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 15px; margin-bottom: 8px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Data</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Categoria</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Descrição</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${tabelaDespesas}
            </tbody>
          </table>
        </div>
        
        <div style="text-align: right; color: #aaa; font-size: 12px; margin-top: 16px;">
          Relatório gerado por ${user?.name || 'Usuário'} em ${new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = { generateLaminaHTML }; 