const authService = require('../services/auth.service');

class AuthController {
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      if (error.message === 'E-mail é obrigatório.') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao solicitar recuperação de senha.' });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao trocar senha:', error);
      if (error.message === 'Token e nova senha são obrigatórios.' || 
          error.message === 'Token inválido ou expirado.') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao trocar senha.' });
    }
  }

  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      const user = await authService.registerUser({ name, email, password });
      res.status(201).json(user);
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      if (error.message === 'Nome, email e senha são obrigatórios.' || 
          error.message === 'Email já cadastrado.') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.loginUser(email, password);
      res.json(result);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      if (error.message === 'Email e senha são obrigatórios.' || 
          error.message === 'Credenciais inválidas.') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao fazer login.' });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const result = await authService.getCurrentUser(req.user.id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      if (error.message === 'Usuário não encontrado.') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  }
}

module.exports = new AuthController();
