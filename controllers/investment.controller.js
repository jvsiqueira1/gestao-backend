const service = require('../services/investment.service');

const send = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message || 'Erro interno.' });
};

class InvestmentController {
  async list(req, res) {
    try {
      const data = await service.listInvestments(req.user.id);
      res.json(data);
    } catch (e) {
      send(res, e);
    }
  }

  async summary(req, res) {
    try {
      const { month, year } = req.query;
      const data = await service.getSummary(req.user.id, month, year);
      res.json(data);
    } catch (e) {
      send(res, e);
    }
  }

  async transactions(req, res) {
    try {
      const { month, year } = req.query;
      const data = await service.listAllTransactions(req.user.id, { month, year });
      res.json(data);
    } catch (e) {
      send(res, e);
    }
  }

  async get(req, res) {
    try {
      const data = await service.getInvestment(req.user.id, req.params.id);
      res.json(data);
    } catch (e) {
      send(res, e);
    }
  }

  async create(req, res) {
    try {
      const data = await service.createInvestment(req.user.id, req.body);
      res.status(201).json(data);
    } catch (e) {
      send(res, e);
    }
  }

  async update(req, res) {
    try {
      const data = await service.updateInvestment(req.user.id, req.params.id, req.body);
      res.json(data);
    } catch (e) {
      send(res, e);
    }
  }

  async remove(req, res) {
    try {
      await service.deleteInvestment(req.user.id, req.params.id);
      res.status(204).end();
    } catch (e) {
      send(res, e);
    }
  }

  async addTransaction(req, res) {
    try {
      const data = await service.addTransaction(req.user.id, req.params.id, req.body);
      res.status(201).json(data);
    } catch (e) {
      send(res, e);
    }
  }

  async deleteTransaction(req, res) {
    try {
      await service.deleteTransaction(req.user.id, req.params.txId);
      res.status(204).end();
    } catch (e) {
      send(res, e);
    }
  }

  async addValuation(req, res) {
    try {
      const data = await service.addValuation(req.user.id, req.params.id, req.body);
      res.status(201).json(data);
    } catch (e) {
      send(res, e);
    }
  }
}

module.exports = new InvestmentController();
