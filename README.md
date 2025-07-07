# Gestão de Gastos Pessoais – Backend

Este é o backend do sistema de gestão de gastos pessoais, desenvolvido em Node.js com Express, Prisma ORM e integração com Stripe para assinaturas.

## Funcionalidades
- API REST para cadastro, login e autenticação de usuários
- Gestão de categorias, receitas, despesas e metas financeiras
- Controle de assinatura mensal via Stripe (criação, cancelamento, reativação)
- Webhook para atualização automática do status da assinatura
- Proteção de rotas por autenticação e status de assinatura

## Pré-requisitos
- Node.js 18+
- NPM, Yarn, PNPM ou Bun
- Banco de dados PostgreSQL (ou SQLite para testes)
- Conta Stripe (modo teste)

## Instalação
```bash
cd backend
npm install # ou yarn, pnpm, bun
```

## Variáveis de Ambiente
Crie um arquivo `.env` na pasta `backend` com:
```
PORT=4000
DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco
JWT_SECRET=sua_chave_jwt
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Rodando o Projeto
```bash
npm run dev # ou npm start
```
A API estará disponível em [http://localhost:4000/api](http://localhost:4000/api)

## Estrutura de Pastas
- `routes/` – Rotas da API (auth, stripe, finance, category, etc)
- `middleware/` – Middlewares de autenticação e autorização
- `prisma/` – Migrations e schema do banco
- `lib/` – Instância do Prisma
- `utils/` – Utilitários e dados padrão

## Integração com Stripe
- Endpoint `/api/stripe/create-checkout-session` cria sessões de assinatura
- Webhook `/api/stripe/webhook` processa eventos do Stripe e atualiza o status do usuário
- O secret do webhook deve ser igual ao do Stripe CLI ou painel

## Comandos Principais
- `npm run dev` – inicia o servidor em modo desenvolvimento
- `npm start` – inicia o servidor em produção
- `npx prisma migrate dev` – aplica migrations do banco
- `npx prisma studio` – interface visual para o banco

## Testando o Stripe localmente
- Use o Stripe CLI: `stripe listen --forward-to localhost:4000/api/stripe/webhook`
- Use cartões de teste: [Stripe Docs](https://stripe.com/docs/testing)

## Integração com o Frontend
- O frontend consome os endpoints REST do backend
- O status da assinatura é atualizado automaticamente via webhook
- Usuários com assinatura cancelada/paga pendente só acessam a página de perfil

---

> Dúvidas ou sugestões? Abra uma issue ou entre em contato! 