const { withUserContext } = require('../lib/with_user_context');

/**
 * Deve rodar DEPOIS de auth_middleware. Abre uma transação Prisma com
 * SET LOCAL app.current_user_id = req.user.id, expõe `req.prisma = tx`,
 * e só resolve a Promise da transação quando a response é finalizada
 * (assim a tx commita junto com a resposta).
 *
 * Endpoints com queries pesadas (dashboard) podem precisar de timeout > 30s.
 */
function rlsMiddleware(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  withUserContext(
    req.user.id,
    (tx) =>
      new Promise((resolve, reject) => {
        req.prisma = tx;
        let settled = false;
        const finish = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        const fail = (err) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        };
        res.on('finish', finish);
        res.on('close', finish);
        res.on('error', fail);
        next();
      }),
    { timeout: 30000 }
  ).catch((err) => {
    console.error('Erro no contexto RLS:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  });
}

module.exports = rlsMiddleware;
