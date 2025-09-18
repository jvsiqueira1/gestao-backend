// Utilitários de formatação para o backend

/**
 * Formata valores monetários para o formato brasileiro
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado (ex: "R$ 1.234,56")
 */
function formatCurrency(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formata data para o formato brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @param {Object} options - Opções de formatação
 * @returns {string} - Data formatada (ex: "15/01/2024")
 */
function formatDate(date, options = {}) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options
  };

  return dateObj.toLocaleDateString('pt-BR', defaultOptions);
}

/**
 * Formata data e hora para o formato brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} - Data e hora formatada (ex: "15/01/2024 14:30")
 */
function formatDateTime(date) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata nome do mês em português
 * @param {number} month - Número do mês (1-12)
 * @returns {string} - Nome do mês (ex: "Janeiro")
 */
function formatMonthName(month) {
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ];

  if (month < 1 || month > 12) return '';
  return months[month - 1];
}

/**
 * Formata nome do mês abreviado em português
 * @param {number} month - Número do mês (1-12)
 * @returns {string} - Nome do mês abreviado (ex: "Jan")
 */
function formatMonthNameShort(month) {
  const months = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez'
  ];

  if (month < 1 || month > 12) return '';
  return months[month - 1];
}

/**
 * Formata percentual
 * @param {number} value - Valor a ser formatado (0-100)
 * @param {number} decimals - Número de casas decimais
 * @returns {string} - Percentual formatado (ex: "85,5%")
 */
function formatPercentage(value, decimals = 1) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

/**
 * Formata número com separadores de milhares
 * @param {number} value - Valor a ser formatado
 * @param {number} decimals - Número de casas decimais
 * @returns {string} - Número formatado (ex: "1.234,56")
 */
function formatNumber(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Formata texto para título (primeira letra maiúscula)
 * @param {string} text - Texto a ser formatado
 * @returns {string} - Texto formatado
 */
function formatTitle(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formata texto para slug (URL-friendly)
 * @param {string} text - Texto a ser formatado
 * @returns {string} - Slug formatado
 */
function formatSlug(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim();
}

/**
 * Formata CPF
 * @param {string} cpf - CPF a ser formatado
 * @returns {string} - CPF formatado (ex: "123.456.789-00")
 */
function formatCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') return '';

  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;

  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ
 * @param {string} cnpj - CNPJ a ser formatado
 * @returns {string} - CNPJ formatado (ex: "12.345.678/0001-90")
 */
function formatCNPJ(cnpj) {
  if (!cnpj || typeof cnpj !== 'string') return '';

  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;

  return cleaned.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Formata telefone
 * @param {string} phone - Telefone a ser formatado
 * @returns {string} - Telefone formatado (ex: "(11) 99999-9999")
 */
function formatPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return phone;
}

/**
 * Formata CEP
 * @param {string} cep - CEP a ser formatado
 * @returns {string} - CEP formatado (ex: "12345-678")
 */
function formatCEP(cep) {
  if (!cep || typeof cep !== 'string') return '';

  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;

  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Formata dados de transação para exibição
 * @param {Object} transaction - Dados da transação
 * @returns {Object} - Dados formatados
 */
function formatTransaction(transaction) {
  if (!transaction) return null;

  return {
    ...transaction,
    value: parseFloat(transaction.value) || 0,
    valueFormatted: formatCurrency(transaction.value),
    date: transaction.date ? new Date(transaction.date) : null,
    dateFormatted: formatDate(transaction.date),
    createdAt: transaction.created_at ? new Date(transaction.created_at) : null,
    createdAtFormatted: formatDateTime(transaction.created_at),
    updatedAt: transaction.updated_at ? new Date(transaction.updated_at) : null,
    updatedAtFormatted: formatDateTime(transaction.updated_at)
  };
}

/**
 * Formata dados de categoria para exibição
 * @param {Object} category - Dados da categoria
 * @returns {Object} - Dados formatados
 */
function formatCategory(category) {
  if (!category) return null;

  return {
    ...category,
    nameFormatted: formatTitle(category.name),
    slug: formatSlug(category.name),
    createdAt: category.created_at ? new Date(category.created_at) : null,
    createdAtFormatted: formatDateTime(category.created_at),
    updatedAt: category.updated_at ? new Date(category.updated_at) : null,
    updatedAtFormatted: formatDateTime(category.updated_at)
  };
}

/**
 * Formata dados de meta financeira para exibição
 * @param {Object} goal - Dados da meta
 * @returns {Object} - Dados formatados
 */
function formatGoal(goal) {
  if (!goal) return null;

  const progress = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
  const isCompleted = progress >= 100;

  return {
    ...goal,
    target: parseFloat(goal.target) || 0,
    saved: parseFloat(goal.saved) || 0,
    targetFormatted: formatCurrency(goal.target),
    savedFormatted: formatCurrency(goal.saved),
    progress: Math.min(100, Math.max(0, progress)),
    progressFormatted: formatPercentage(progress),
    isCompleted,
    deadline: goal.deadline ? new Date(goal.deadline) : null,
    deadlineFormatted: formatDate(goal.deadline),
    createdAt: goal.created_at ? new Date(goal.created_at) : null,
    createdAtFormatted: formatDateTime(goal.created_at),
    updatedAt: goal.updated_at ? new Date(goal.updated_at) : null,
    updatedAtFormatted: formatDateTime(goal.updated_at)
  };
}

/**
 * Formata dados de usuário para exibição (sem dados sensíveis)
 * @param {Object} user - Dados do usuário
 * @returns {Object} - Dados formatados
 */
function formatUser(user) {
  if (!user) return null;

  const { password: _password, ...userWithoutPassword } = user;

  return {
    ...userWithoutPassword,
    nameFormatted: formatTitle(user.name),
    emailFormatted: user.email.toLowerCase(),
    createdAt: user.created_at ? new Date(user.created_at) : null,
    createdAtFormatted: formatDateTime(user.created_at),
    updatedAt: user.updated_at ? new Date(user.updated_at) : null,
    updatedAtFormatted: formatDateTime(user.updated_at),
    premiumUntil: user.premium_until ? new Date(user.premium_until) : null,
    premiumUntilFormatted: formatDate(user.premium_until)
  };
}

module.exports = {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMonthName,
  formatMonthNameShort,
  formatPercentage,
  formatNumber,
  formatTitle,
  formatSlug,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  formatTransaction,
  formatCategory,
  formatGoal,
  formatUser
};
