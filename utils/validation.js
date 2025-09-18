// Utilitários de validação para o backend

/**
 * Valida se um valor é um número válido
 * @param {any} value - Valor a ser validado
 * @param {string} fieldName - Nome do campo para mensagens de erro
 * @returns {Object} - { isValid: boolean, error?: string, value?: number }
 */
function validateNumber(value, fieldName = 'valor') {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} é obrigatório` };
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} deve ser um número válido` };
  }

  if (numValue < 0) {
    return {
      isValid: false,
      error: `${fieldName} deve ser maior ou igual a zero`
    };
  }

  return { isValid: true, value: numValue };
}

/**
 * Valida se uma string não está vazia
 * @param {any} value - Valor a ser validado
 * @param {string} fieldName - Nome do campo para mensagens de erro
 * @param {number} minLength - Comprimento mínimo
 * @param {number} maxLength - Comprimento máximo
 * @returns {Object} - { isValid: boolean, error?: string, value?: string }
 */
function validateString(
  value,
  fieldName = 'campo',
  minLength = 1,
  maxLength = 255
) {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} é obrigatório` };
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} deve ter pelo menos ${minLength} caracteres`
    };
  }

  if (trimmedValue.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} deve ter no máximo ${maxLength} caracteres`
    };
  }

  return { isValid: true, value: trimmedValue };
}

/**
 * Valida formato de data YYYY-MM-DD
 * @param {any} value - Valor a ser validado
 * @param {string} fieldName - Nome do campo para mensagens de erro
 * @returns {Object} - { isValid: boolean, error?: string, value?: Date }
 */
function validateDate(value, fieldName = 'data') {
  if (!value) {
    return { isValid: false, error: `${fieldName} é obrigatória` };
  }

  // Se já é um objeto Date, validar se é válido
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return { isValid: false, error: `${fieldName} inválida` };
    }
    return { isValid: true, value };
  }

  // Se é string, validar formato YYYY-MM-DD
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(trimmedValue)) {
      return {
        isValid: false,
        error: `${fieldName} deve estar no formato YYYY-MM-DD`
      };
    }

    const dateObj = new Date(trimmedValue + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return { isValid: false, error: `${fieldName} inválida` };
    }

    // Validar se a data não é muito antiga ou futura
    const _now = new Date();
    const minDate = new Date(1900, 0, 1);
    const maxDate = new Date(2100, 11, 31);

    if (dateObj < minDate || dateObj > maxDate) {
      return {
        isValid: false,
        error: `${fieldName} deve estar entre 1900 e 2100`
      };
    }

    return { isValid: true, value: dateObj };
  }

  return { isValid: false, error: `${fieldName} deve ser uma data válida` };
}

/**
 * Valida se um ID é um número inteiro positivo
 * @param {any} value - Valor a ser validado
 * @param {string} fieldName - Nome do campo para mensagens de erro
 * @returns {Object} - { isValid: boolean, error?: string, value?: number }
 */
function validateId(value, fieldName = 'ID') {
  if (!value) {
    return { isValid: false, error: `${fieldName} é obrigatório` };
  }

  const numValue = parseInt(value);
  if (isNaN(numValue) || !Number.isInteger(numValue) || numValue <= 0) {
    return {
      isValid: false,
      error: `${fieldName} deve ser um número inteiro positivo`
    };
  }

  return { isValid: true, value: numValue };
}

/**
 * Valida se um email tem formato válido
 * @param {any} value - Valor a ser validado
 * @param {string} fieldName - Nome do campo para mensagens de erro
 * @returns {Object} - { isValid: boolean, error?: string, value?: string }
 */
function validateEmail(value, fieldName = 'email') {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} é obrigatório` };
  }

  const trimmedValue = value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedValue)) {
    return { isValid: false, error: `${fieldName} deve ter um formato válido` };
  }

  if (trimmedValue.length > 255) {
    return {
      isValid: false,
      error: `${fieldName} deve ter no máximo 255 caracteres`
    };
  }

  return { isValid: true, value: trimmedValue };
}

/**
 * Valida se uma senha atende aos critérios de segurança
 * @param {any} value - Valor a ser validado
 * @param {string} fieldName - Nome do campo para mensagens de erro
 * @returns {Object} - { isValid: boolean, error?: string, value?: string }
 */
function validatePassword(value, fieldName = 'senha') {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} é obrigatória` };
  }

  if (value.length < 6) {
    return {
      isValid: false,
      error: `${fieldName} deve ter pelo menos 6 caracteres`
    };
  }

  if (value.length > 128) {
    return {
      isValid: false,
      error: `${fieldName} deve ter no máximo 128 caracteres`
    };
  }

  return { isValid: true, value };
}

/**
 * Valida se um valor está em uma lista de opções válidas
 * @param {any} value - Valor a ser validado
 * @param {Array} validOptions - Lista de opções válidas
 * @param {string} fieldName - Nome do campo para mensagens de erro
 * @returns {Object} - { isValid: boolean, error?: string, value?: any }
 */
function validateEnum(value, validOptions, fieldName = 'campo') {
  if (!value) {
    return { isValid: false, error: `${fieldName} é obrigatório` };
  }

  if (!validOptions.includes(value)) {
    return {
      isValid: false,
      error: `${fieldName} deve ser uma das opções: ${validOptions.join(', ')}`
    };
  }

  return { isValid: true, value };
}

/**
 * Valida múltiplos campos e retorna erros consolidados
 * @param {Object} validations - Objeto com validações { field: validationResult }
 * @returns {Object} - { isValid: boolean, errors: Array, data: Object }
 */
function validateMultiple(validations) {
  const errors = [];
  const data = {};

  for (const [field, validation] of Object.entries(validations)) {
    if (!validation.isValid) {
      errors.push({
        field,
        message: validation.error,
        value: validation.value
      });
    } else {
      data[field] = validation.value;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data
  };
}

/**
 * Valida parâmetros de paginação
 * @param {Object} params - { page, limit }
 * @returns {Object} - { isValid: boolean, errors: Array, data: Object }
 */
function validatePagination(params) {
  const { page = 1, limit = 10 } = params;
  const errors = [];

  const pageValidation = validateId(page, 'página');
  if (!pageValidation.isValid) {
    errors.push({ field: 'page', message: pageValidation.error });
  }

  const limitValidation = validateId(limit, 'limite');
  if (!limitValidation.isValid) {
    errors.push({ field: 'limit', message: limitValidation.error });
  } else if (limitValidation.value > 100) {
    errors.push({ field: 'limit', message: 'Limite deve ser no máximo 100' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      page: pageValidation.value || 1,
      limit: limitValidation.value || 10,
      offset: ((pageValidation.value || 1) - 1) * (limitValidation.value || 10)
    }
  };
}

/**
 * Valida parâmetros de filtro de data
 * @param {Object} params - { month, year }
 * @returns {Object} - { isValid: boolean, errors: Array, data: Object }
 */
function validateDateFilter(params) {
  const { month, year } = params;
  const errors = [];

  if (month !== undefined) {
    const monthValidation = validateId(month, 'mês');
    if (!monthValidation.isValid) {
      errors.push({ field: 'month', message: monthValidation.error });
    } else if (monthValidation.value < 1 || monthValidation.value > 12) {
      errors.push({ field: 'month', message: 'Mês deve estar entre 1 e 12' });
    }
  }

  if (year !== undefined) {
    const yearValidation = validateId(year, 'ano');
    if (!yearValidation.isValid) {
      errors.push({ field: 'year', message: yearValidation.error });
    } else if (yearValidation.value < 1900 || yearValidation.value > 2100) {
      errors.push({
        field: 'year',
        message: 'Ano deve estar entre 1900 e 2100'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      month: month !== undefined ? parseInt(month) : undefined,
      year: year !== undefined ? parseInt(year) : undefined
    }
  };
}

module.exports = {
  validateNumber,
  validateString,
  validateDate,
  validateId,
  validateEmail,
  validatePassword,
  validateEnum,
  validateMultiple,
  validatePagination,
  validateDateFilter
};
