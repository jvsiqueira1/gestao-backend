const { generateLaminaHTML } = require('../utils/laminaGenerator');
const { generatePDFFromHTML } = require('../utils/pdfGenerator');
const prisma = require('../lib/prisma');

const getMonthName = (month) => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1];
};

// Função para buscar dados do dashboard de um usuário
async function buscarDadosDoMesAnterior(userId, mes, ano) {
  try {
    const startDate = new Date(ano, mes - 1, 1);
    const endDate = new Date(ano, mes, 1);

    // Buscar receitas do mês
    const incomes = await prisma.income.findMany({
      where: {
        user_id: userId,
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Buscar despesas do mês
    const expenses = await prisma.expense.findMany({
      where: {
        user_id: userId,
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Calcular totais
    const monthlyIncome = incomes.reduce((sum, income) => sum + parseFloat(income.value), 0);
    const monthlyExpense = expenses.reduce((sum, expense) => sum + parseFloat(expense.value), 0);

    // Buscar dados de categoria para despesas
    const categoryData = await prisma.expense.groupBy({
      by: ['category_id'],
      where: {
        user_id: userId,
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      _sum: {
        value: true
      }
    });

    // Buscar nomes das categorias
    const categoryIds = categoryData.map(cat => cat.category_id);
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds }
      },
      select: { id: true, name: true }
    });

    // Formatar dados de categoria
    const formattedCategoryData = categoryData.map(cat => {
      const category = categories.find(c => c.id === cat.category_id);
      return {
        name: category ? category.name : 'Sem categoria',
        value: parseFloat(cat._sum.value)
      };
    });

    return {
      monthlyIncome,
      monthlyExpense,
      categoryData: formattedCategoryData,
      userCreatedAt: null // Adicione se necessário
    };
  } catch (error) {
    console.error('Erro ao buscar dados do mês anterior:', error);
    return null;
  }
}

// Função para buscar transações do mês
async function buscarTransacoesDoMes(userId, mes, ano) {
  try {
    const startDate = new Date(ano, mes - 1, 1);
    const endDate = new Date(ano, mes, 1);

    // Buscar receitas
    const incomes = await prisma.income.findMany({
      where: {
        user_id: userId,
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Buscar despesas
    const expenses = await prisma.expense.findMany({
      where: {
        user_id: userId,
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Formatar dados
    const formattedIncomes = incomes.map(income => ({
      ...income,
      category_name: income.category?.name || null
    }));

    const formattedExpenses = expenses.map(expense => ({
      ...expense,
      category_name: expense.category?.name || null
    }));

    return {
      incomes: formattedIncomes,
      expenses: formattedExpenses
    };
  } catch (error) {
    console.error('Erro ao buscar transações do mês:', error);
    return { incomes: [], expenses: [] };
  }
}

// Função para buscar todos os usuários
async function buscarTodosUsuarios() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    return users;
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
}

// Função para enviar e-mail com PDF
async function enviarEmailComPdf(destinatario, pdfBuffer, mes, ano) {
  // Aqui você deve usar seu serviço de e-mail já configurado
  // Exemplo com nodemailer:
  
  // const nodemailer = require('nodemailer');
  // const transporter = nodemailer.createTransporter({
  //   // Sua configuração de e-mail
  // });
  
  // await transporter.sendMail({
  //   from: process.env.EMAIL_FROM || 'seu@email.com',
  //   to: destinatario,
  //   subject: `Relatório Financeiro - ${getMonthName(mes)}/${ano}`,
  //   text: `Segue em anexo seu relatório financeiro de ${getMonthName(mes)}/${ano}.`,
  //   attachments: [
  //     {
  //       filename: `relatorio-financeiro-${mes}-${ano}.pdf`,
  //       content: pdfBuffer,
  //       contentType: 'application/pdf'
  //     }
  //   ]
  // });
  
}

// Função para enviar relatório individual
async function enviarRelatorioMensal(usuario, dados, laminaData, mes, ano) {
  try {
    // Gerar HTML da lâmina
    const htmlContent = generateLaminaHTML(dados, laminaData, usuario, mes, ano);
    
    // Gerar PDF
    const pdfBuffer = await generatePDFFromHTML(htmlContent);
    
    // Enviar e-mail
    await enviarEmailComPdf(usuario.email, pdfBuffer, mes, ano);
    
  } catch (error) {
    console.error(`Erro ao enviar relatório para ${usuario.email}:`, error);
  }
}

// Função principal que roda todo dia 01
async function enviarRelatoriosMensais() {
  try {
    const mesAnterior = new Date();
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    const mes = mesAnterior.getMonth() + 1;
    const ano = mesAnterior.getFullYear();
    
    const usuarios = await buscarTodosUsuarios();
    
    for (const usuario of usuarios) {
      // Buscar dados do mês anterior
      const dados = await buscarDadosDoMesAnterior(usuario.id, mes, ano);
      const laminaData = await buscarTransacoesDoMes(usuario.id, mes, ano);
      
      if (dados && laminaData) {
        await enviarRelatorioMensal(usuario, dados, laminaData, mes, ano);
      }
    }
    
  } catch (error) {
    console.error('Erro ao enviar relatórios mensais:', error);
  }
}

module.exports = { 
  enviarRelatoriosMensais,
  enviarRelatorioMensal,
  buscarDadosDoMesAnterior,
  buscarTransacoesDoMes,
  buscarTodosUsuarios
}; 