// Utilitários para manipulação de erros

const { ERROR_MESSAGES, HTTP_STATUS } = require('../constants');

/**
 * Classe base para erros customizados
 */
class AppError extends Error {
  constructor(
    message,
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de validação
 */
class ValidationError extends AppError {
  constructor(message = ERROR_MESSAGES.VALIDATION.REQUIRED, field = null) {
    super(message, HTTP_STATUS.BAD_REQUEST);
    this.field = field;
    this.type = 'ValidationError';
  }
}

/**
 * Erro de autenticação
 */
class AuthenticationError extends AppError {
  constructor(message = ERROR_MESSAGES.AUTH.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED);
    this.type = 'AuthenticationError';
  }
}

/**
 * Erro de autorização
 */
class AuthorizationError extends AppError {
  constructor(message = ERROR_MESSAGES.AUTH.FORBIDDEN) {
    super(message, HTTP_STATUS.FORBIDDEN);
    this.type = 'AuthorizationError';
  }
}

/**
 * Erro de recurso não encontrado
 */
class NotFoundError extends AppError {
  constructor(message = ERROR_MESSAGES.RESOURCE.NOT_FOUND) {
    super(message, HTTP_STATUS.NOT_FOUND);
    this.type = 'NotFoundError';
  }
}

/**
 * Erro de conflito
 */
class ConflictError extends AppError {
  constructor(message = ERROR_MESSAGES.RESOURCE.CONFLICT) {
    super(message, HTTP_STATUS.CONFLICT);
    this.type = 'ConflictError';
  }
}

/**
 * Erro de limite de taxa excedido
 */
class RateLimitError extends AppError {
  constructor(message = 'Muitas tentativas. Tente novamente mais tarde.') {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS);
    this.type = 'RateLimitError';
  }
}

/**
 * Erro de banco de dados
 */
class DatabaseError extends AppError {
  constructor(message = 'Erro no banco de dados', originalError = null) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    this.type = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * Erro de serviço externo
 */
class ExternalServiceError extends AppError {
  constructor(
    service,
    message = 'Erro em serviço externo',
    originalError = null
  ) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE);
    this.type = 'ExternalServiceError';
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Formata erro para resposta da API
 * @param {Error} error - Erro a ser formatado
 * @param {boolean} includeStack - Se deve incluir stack trace
 * @returns {Object} - Erro formatado
 */
function formatError(error, includeStack = false) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const formattedError = {
    success: false,
    error: {
      message: error.message || ERROR_MESSAGES.SERVER.INTERNAL_ERROR,
      type: error.type || 'UnknownError',
      statusCode: error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  // Adicionar campos específicos baseados no tipo de erro
  if (error.field) {
    formattedError.error.field = error.field;
  }

  if (error.service) {
    formattedError.error.service = error.service;
  }

  // Incluir stack trace apenas em desenvolvimento
  if (includeStack && isDevelopment && error.stack) {
    formattedError.error.stack = error.stack;
  }

  // Incluir detalhes do erro original se disponível
  if (error.originalError && isDevelopment) {
    formattedError.error.originalError = {
      message: error.originalError.message,
      type: error.originalError.constructor.name
    };
  }

  return formattedError;
}

/**
 * Middleware de tratamento de erros
 * @param {Error} error - Erro capturado
 * @param {Object} req - Objeto da requisição
 * @param {Object} res - Objeto da resposta
 * @param {Function} next - Próxima função middleware
 */
function errorHandler(error, req, res, _next) {
  let statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = error.message || ERROR_MESSAGES.SERVER.INTERNAL_ERROR;

  // Log do erro
  console.error('Erro capturado:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Tratamento específico para diferentes tipos de erro
  if (error.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = ERROR_MESSAGES.VALIDATION.REQUIRED;
  } else if (error.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'ID inválido';
  } else if (error.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    message = ERROR_MESSAGES.RESOURCE.ALREADY_EXISTS;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.AUTH.TOKEN_INVALID;
  } else if (error.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.AUTH.TOKEN_EXPIRED;
  } else if (error.name === 'MulterError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Erro no upload de arquivo';
  }

  // Verificar se é um erro operacional
  const isOperational = error.isOperational !== false;
  const includeStack = process.env.NODE_ENV === 'development' && isOperational;

  const formattedError = formatError(
    {
      ...error,
      statusCode,
      message
    },
    includeStack
  );

  res.status(statusCode).json(formattedError);
}

/**
 * Middleware para capturar erros assíncronos
 * @param {Function} fn - Função assíncrona
 * @returns {Function} - Função wrapper
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Valida se um erro é operacional
 * @param {Error} error - Erro a ser verificado
 * @returns {boolean} - True se é operacional
 */
function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Cria um erro de validação com múltiplos campos
 * @param {Array} errors - Array de erros de validação
 * @returns {ValidationError} - Erro de validação
 */
function createValidationError(errors) {
  const error = new ValidationError('Dados inválidos');
  error.details = errors;
  return error;
}

/**
 * Cria um erro de banco de dados
 * @param {Error} originalError - Erro original do banco
 * @param {string} operation - Operação que falhou
 * @returns {DatabaseError} - Erro de banco de dados
 */
function createDatabaseError(originalError, operation = 'database operation') {
  const message = `Erro na operação: ${operation}`;
  return new DatabaseError(message, originalError);
}

/**
 * Cria um erro de serviço externo
 * @param {string} service - Nome do serviço
 * @param {Error} originalError - Erro original
 * @param {string} operation - Operação que falhou
 * @returns {ExternalServiceError} - Erro de serviço externo
 */
function createExternalServiceError(
  service,
  originalError,
  operation = 'external service call'
) {
  const message = `Erro no serviço ${service}: ${operation}`;
  return new ExternalServiceError(service, message, originalError);
}

/**
 * Wrapper para funções que podem falhar
 * @param {Function} fn - Função a ser executada
 * @param {string} errorMessage - Mensagem de erro personalizada
 * @returns {Function} - Função wrapper
 */
function safeExecute(fn, errorMessage = 'Operação falhou') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw new AppError(
        errorMessage,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        false
      );
    }
  };
}

/**
 * Valida se um erro deve ser logado
 * @param {Error} error - Erro a ser verificado
 * @returns {boolean} - True se deve ser logado
 */
function shouldLogError(error) {
  // Logar todos os erros não operacionais
  if (!isOperationalError(error)) {
    return true;
  }

  // Logar erros de servidor (5xx)
  if (error.statusCode >= 500) {
    return true;
  }

  // Logar erros de autenticação e autorização
  if (error.statusCode === 401 || error.statusCode === 403) {
    return true;
  }

  return false;
}

/**
 * Obtém informações do erro para logging
 * @param {Error} error - Erro a ser analisado
 * @param {Object} req - Objeto da requisição
 * @returns {Object} - Informações do erro
 */
function getErrorInfo(error, req = null) {
  const info = {
    message: error.message,
    type: error.type || error.constructor.name,
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString(),
    isOperational: isOperationalError(error)
  };

  if (req) {
    info.request = {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    };
  }

  if (error.stack) {
    info.stack = error.stack;
  }

  if (error.originalError) {
    info.originalError = {
      message: error.originalError.message,
      type: error.originalError.constructor.name
    };
  }

  return info;
}

module.exports = {
  // Classes de erro
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,

  // Funções utilitárias
  formatError,
  errorHandler,
  asyncHandler,
  isOperationalError,
  createValidationError,
  createDatabaseError,
  createExternalServiceError,
  safeExecute,
  shouldLogError,
  getErrorInfo
};
