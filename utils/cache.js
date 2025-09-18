// Utilitários de cache para o backend

const NodeCache = require('node-cache');
const { CACHE } = require('../constants');

// Instância do cache com configurações padrão
const cache = new NodeCache({
  stdTTL: 300, // 5 minutos por padrão
  checkperiod: 120, // Verificar expiração a cada 2 minutos
  useClones: false // Não clonar objetos para melhor performance
});

/**
 * Armazena um valor no cache
 * @param {string} key - Chave do cache
 * @param {*} value - Valor a ser armazenado
 * @param {number} ttl - Tempo de vida em segundos (opcional)
 * @returns {boolean} - True se armazenado com sucesso
 */
function set(key, value, ttl = null) {
  try {
    if (ttl) {
      return cache.set(key, value, ttl);
    }
    return cache.set(key, value);
  } catch (error) {
    console.error('Erro ao armazenar no cache:', error);
    return false;
  }
}

/**
 * Recupera um valor do cache
 * @param {string} key - Chave do cache
 * @returns {*} - Valor armazenado ou undefined
 */
function get(key) {
  try {
    return cache.get(key);
  } catch (error) {
    console.error('Erro ao recuperar do cache:', error);
    return undefined;
  }
}

/**
 * Remove um valor do cache
 * @param {string} key - Chave do cache
 * @returns {number} - Número de chaves removidas
 */
function del(key) {
  try {
    return cache.del(key);
  } catch (error) {
    console.error('Erro ao remover do cache:', error);
    return 0;
  }
}

/**
 * Verifica se uma chave existe no cache
 * @param {string} key - Chave do cache
 * @returns {boolean} - True se a chave existe
 */
function has(key) {
  try {
    return cache.has(key);
  } catch (error) {
    console.error('Erro ao verificar chave no cache:', error);
    return false;
  }
}

/**
 * Limpa todo o cache
 * @returns {void}
 */
function flush() {
  try {
    cache.flushAll();
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
}

/**
 * Obtém estatísticas do cache
 * @returns {Object} - Estatísticas do cache
 */
function getStats() {
  try {
    return cache.getStats();
  } catch (error) {
    console.error('Erro ao obter estatísticas do cache:', error);
    return {};
  }
}

/**
 * Obtém todas as chaves do cache
 * @returns {string[]} - Array de chaves
 */
function keys() {
  try {
    return cache.keys();
  } catch (error) {
    console.error('Erro ao obter chaves do cache:', error);
    return [];
  }
}

/**
 * Armazena dados do dashboard no cache
 * @param {number} userId - ID do usuário
 * @param {number} month - Mês
 * @param {number} year - Ano
 * @param {Object} data - Dados do dashboard
 * @returns {boolean} - True se armazenado com sucesso
 */
function setDashboardData(userId, month, year, data) {
  const key = CACHE.KEYS.DASHBOARD(userId, month, year);
  const ttl = CACHE.TTL.DASHBOARD / 1000; // Converter para segundos
  return set(key, data, ttl);
}

/**
 * Recupera dados do dashboard do cache
 * @param {number} userId - ID do usuário
 * @param {number} month - Mês
 * @param {number} year - Ano
 * @returns {Object|undefined} - Dados do dashboard ou undefined
 */
function getDashboardData(userId, month, year) {
  const key = CACHE.KEYS.DASHBOARD(userId, month, year);
  return get(key);
}

/**
 * Armazena categorias do usuário no cache
 * @param {number} userId - ID do usuário
 * @param {Array} categories - Lista de categorias
 * @returns {boolean} - True se armazenado com sucesso
 */
function setUserCategories(userId, categories) {
  const key = CACHE.KEYS.CATEGORIES(userId);
  const ttl = CACHE.TTL.CATEGORIES / 1000; // Converter para segundos
  return set(key, categories, ttl);
}

/**
 * Recupera categorias do usuário do cache
 * @param {number} userId - ID do usuário
 * @returns {Array|undefined} - Lista de categorias ou undefined
 */
function getUserCategories(userId) {
  const key = CACHE.KEYS.CATEGORIES(userId);
  return get(key);
}

/**
 * Armazena dados do usuário no cache
 * @param {number} userId - ID do usuário
 * @param {Object} userData - Dados do usuário
 * @returns {boolean} - True se armazenado com sucesso
 */
function setUserData(userId, userData) {
  const key = CACHE.KEYS.USER_DATA(userId);
  const ttl = CACHE.TTL.USER_DATA / 1000; // Converter para segundos
  return set(key, userData, ttl);
}

/**
 * Recupera dados do usuário do cache
 * @param {number} userId - ID do usuário
 * @returns {Object|undefined} - Dados do usuário ou undefined
 */
function getUserData(userId) {
  const key = CACHE.KEYS.USER_DATA(userId);
  return get(key);
}

/**
 * Armazena relatório no cache
 * @param {number} userId - ID do usuário
 * @param {string} type - Tipo do relatório
 * @param {string} period - Período do relatório
 * @param {Object} reportData - Dados do relatório
 * @returns {boolean} - True se armazenado com sucesso
 */
function setReportData(userId, type, period, reportData) {
  const key = CACHE.KEYS.REPORTS(userId, type, period);
  const ttl = CACHE.TTL.REPORTS / 1000; // Converter para segundos
  return set(key, reportData, ttl);
}

/**
 * Recupera relatório do cache
 * @param {number} userId - ID do usuário
 * @param {string} type - Tipo do relatório
 * @param {string} period - Período do relatório
 * @returns {Object|undefined} - Dados do relatório ou undefined
 */
function getReportData(userId, type, period) {
  const key = CACHE.KEYS.REPORTS(userId, type, period);
  return get(key);
}

/**
 * Remove dados do usuário do cache (usado no logout)
 * @param {number} userId - ID do usuário
 * @returns {void}
 */
function clearUserCache(userId) {
  const patterns = [
    CACHE.KEYS.DASHBOARD(userId, '*', '*'),
    CACHE.KEYS.CATEGORIES(userId),
    CACHE.KEYS.USER_DATA(userId),
    CACHE.KEYS.REPORTS(userId, '*', '*')
  ];

  patterns.forEach(pattern => {
    if (pattern.includes('*')) {
      // Para padrões com wildcard, buscar todas as chaves e filtrar
      const allKeys = keys();
      const matchingKeys = allKeys.filter(key => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(key);
      });
      matchingKeys.forEach(key => del(key));
    } else {
      del(pattern);
    }
  });
}

/**
 * Middleware para cache de rotas
 * @param {string} keyGenerator - Função para gerar chave do cache
 * @param {number} ttl - Tempo de vida em segundos
 * @returns {Function} - Middleware function
 */
function cacheMiddleware(keyGenerator, ttl = 300) {
  return (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const cachedData = get(key);

      if (cachedData) {
        return res.json(cachedData);
      }

      // Interceptar res.json para armazenar no cache
      const originalJson = res.json;
      res.json = function(data) {
        set(key, data, ttl);
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Erro no middleware de cache:', error);
      next();
    }
  };
}

/**
 * Função para gerar chave de cache baseada em parâmetros da requisição
 * @param {Object} req - Objeto da requisição
 * @returns {string} - Chave do cache
 */
function generateCacheKey(req) {
  const { userId, month, year, type } = req.query;
  const { path } = req.route;
  
  return `${path}:${userId || 'anonymous'}:${month || 'all'}:${year || 'all'}:${type || 'default'}`;
}

/**
 * Verifica se o cache está funcionando corretamente
 * @returns {boolean} - True se o cache está funcionando
 */
function isHealthy() {
  try {
    const testKey = 'health_check';
    const testValue = { timestamp: Date.now() };
    
    set(testKey, testValue, 10); // 10 segundos
    const retrieved = get(testKey);
    del(testKey);
    
    return retrieved && retrieved.timestamp === testValue.timestamp;
  } catch (error) {
    console.error('Cache health check failed:', error);
    return false;
  }
}

module.exports = {
  // Funções básicas do cache
  set,
  get,
  del,
  has,
  flush,
  getStats,
  keys,
  
  // Funções específicas para dados
  setDashboardData,
  getDashboardData,
  setUserCategories,
  getUserCategories,
  setUserData,
  getUserData,
  setReportData,
  getReportData,
  clearUserCache,
  
  // Middleware e utilitários
  cacheMiddleware,
  generateCacheKey,
  isHealthy
};
