// Constantes do backend

/**
 * Status de transações
 */
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled'
};

/**
 * Tipos de recorrência
 */
const RECURRENCE_TYPES = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

/**
 * Status de metas financeiras
 */
const GOAL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

/**
 * Níveis de acesso do usuário
 */
const ACCESS_LEVELS = {
  FREE: 0,
  PREMIUM: 1,
  ADMIN: 2
};

/**
 * Tipos de transação
 */
const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense'
};

/**
 * Categorias padrão do sistema
 */
const DEFAULT_CATEGORIES = {
  INCOME: [
    { name: 'Salário', description: 'Renda salarial' },
    { name: 'Freelance', description: 'Trabalhos autônomos' },
    { name: 'Investimentos', description: 'Rendimentos de investimentos' },
    { name: 'Vendas', description: 'Vendas de produtos/serviços' },
    { name: 'Outros', description: 'Outras receitas' }
  ],
  EXPENSE: [
    { name: 'Alimentação', description: 'Gastos com comida' },
    { name: 'Transporte', description: 'Gastos com transporte' },
    { name: 'Moradia', description: 'Aluguel, financiamento, condomínio' },
    { name: 'Saúde', description: 'Gastos com saúde' },
    { name: 'Educação', description: 'Gastos com educação' },
    { name: 'Lazer', description: 'Gastos com entretenimento' },
    { name: 'Outros', description: 'Outras despesas' }
  ]
};

/**
 * Configurações de paginação
 */
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

/**
 * Configurações de cache
 */
const CACHE = {
  TTL: {
    DASHBOARD: 5 * 60 * 1000, // 5 minutos
    CATEGORIES: 10 * 60 * 1000, // 10 minutos
    USER_DATA: 2 * 60 * 1000, // 2 minutos
    REPORTS: 15 * 60 * 1000 // 15 minutos
  },
  KEYS: {
    DASHBOARD: (userId, month, year) => `dashboard:${userId}:${year}-${month}`,
    CATEGORIES: (userId) => `categories:${userId}`,
    USER_DATA: (userId) => `user:${userId}`,
    REPORTS: (userId, type, period) => `report:${userId}:${type}:${period}`
  }
};

/**
 * Configurações de validação
 */
const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: false
  },
  EMAIL: {
    MAX_LENGTH: 255,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100
  },
  DESCRIPTION: {
    MAX_LENGTH: 500
  },
  VALUE: {
    MIN: 0.01,
    MAX: 999999999.99,
    DECIMALS: 2
  },
  DATE: {
    MIN_YEAR: 1900,
    MAX_YEAR: 2100
  }
};

/**
 * Configurações de relatórios
 */
const REPORTS = {
  TYPES: {
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    CUSTOM: 'custom'
  },
  FORMATS: {
    PDF: 'pdf',
    EXCEL: 'excel',
    CSV: 'csv'
  },
  MAX_PERIOD_DAYS: 365
};

/**
 * Configurações de notificações
 */
const NOTIFICATIONS = {
  TYPES: {
    GOAL_ACHIEVED: 'goal_achieved',
    GOAL_DEADLINE: 'goal_deadline',
    BUDGET_EXCEEDED: 'budget_exceeded',
    RECURRING_TRANSACTION: 'recurring_transaction'
  },
  CHANNELS: {
    EMAIL: 'email',
    PUSH: 'push',
    SMS: 'sms'
  }
};

/**
 * Configurações de API
 */
const API = {
  VERSION: 'v1',
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 100 // por IP
  },
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || '*',
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization']
  }
};

/**
 * Configurações de banco de dados
 */
const DATABASE = {
  CONNECTION_POOL: {
    MIN: 2,
    MAX: 10,
    IDLE_TIMEOUT: 30000,
    CONNECTION_TIMEOUT: 2000
  },
  QUERY_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3
};

/**
 * Configurações de segurança
 */
const SECURITY = {
  JWT: {
    EXPIRES_IN: '24h',
    REFRESH_EXPIRES_IN: '7d',
    ALGORITHM: 'HS256'
  },
  BCRYPT: {
    ROUNDS: 12
  },
  RATE_LIMIT: {
    LOGIN: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutos
      MAX_ATTEMPTS: 5
    },
    PASSWORD_RESET: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hora
      MAX_ATTEMPTS: 3
    }
  }
};

/**
 * Configurações de email
 */
const EMAIL = {
  FROM: {
    NAME: 'Sistema Financeiro',
    EMAIL: process.env.EMAIL_FROM || 'noreply@exemplo.com'
  },
  TEMPLATES: {
    PASSWORD_RESET: 'password-reset',
    WELCOME: 'welcome',
    GOAL_ACHIEVED: 'goal-achieved',
    MONTHLY_REPORT: 'monthly-report'
  }
};

/**
 * Configurações de Stripe
 */
const STRIPE = {
  CURRENCY: 'brl',
  PLANS: {
    MONTHLY: {
      ID: 'monthly_premium',
      AMOUNT: 1990, // R$ 19,90 em centavos
      INTERVAL: 'month'
    },
    YEARLY: {
      ID: 'yearly_premium',
      AMOUNT: 19900, // R$ 199,00 em centavos
      INTERVAL: 'year'
    }
  }
};

/**
 * Mensagens de erro padronizadas
 */
const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED: 'Campo obrigatório',
    INVALID_EMAIL: 'Email inválido',
    INVALID_PASSWORD: 'Senha deve ter pelo menos 8 caracteres',
    INVALID_DATE: 'Data inválida',
    INVALID_VALUE: 'Valor deve ser maior que zero',
    INVALID_RECURRENCE: 'Tipo de recorrência inválido',
    INVALID_STATUS: 'Status inválido'
  },
  AUTH: {
    INVALID_CREDENTIALS: 'Credenciais inválidas',
    UNAUTHORIZED: 'Não autorizado',
    FORBIDDEN: 'Acesso negado',
    TOKEN_EXPIRED: 'Token expirado',
    TOKEN_INVALID: 'Token inválido'
  },
  RESOURCE: {
    NOT_FOUND: 'Recurso não encontrado',
    ALREADY_EXISTS: 'Recurso já existe',
    CONFLICT: 'Conflito de dados',
    GONE: 'Recurso não disponível'
  },
  SERVER: {
    INTERNAL_ERROR: 'Erro interno do servidor',
    SERVICE_UNAVAILABLE: 'Serviço indisponível',
    TIMEOUT: 'Tempo limite excedido'
  }
};

/**
 * Códigos de status HTTP
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Configurações de logging
 */
const LOGGING = {
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  },
  FORMATS: {
    JSON: 'json',
    SIMPLE: 'simple',
    COMBINED: 'combined'
  }
};

module.exports = {
  TRANSACTION_STATUS,
  RECURRENCE_TYPES,
  GOAL_STATUS,
  ACCESS_LEVELS,
  TRANSACTION_TYPES,
  DEFAULT_CATEGORIES,
  PAGINATION,
  CACHE,
  VALIDATION,
  REPORTS,
  NOTIFICATIONS,
  API,
  DATABASE,
  SECURITY,
  EMAIL,
  STRIPE,
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOGGING
};
