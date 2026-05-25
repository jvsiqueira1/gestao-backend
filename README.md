# Gestão de Gastos Pessoais – Backend

Backend single-user para gestão financeira pessoal, em Node.js + Express + Prisma ORM, com Postgres (Neon) como banco.

## Funcionalidades
- API REST para autenticação (JWT) com lock de owner único
- Categorias, receitas, despesas (avulsas e fixas) e metas financeiras
- Investimentos com transações e valuations
- Proteção de rotas via middleware de autenticação

## Pré-requisitos
- Node.js 20+
- NPM
- Banco PostgreSQL (Neon recomendado)

## Instalação
```bash
cd backend
npm install
```

## Variáveis de Ambiente
Veja `.env.exemple`. Mínimo:
```
DATABASE_URL=<neon pooled>
DIRECT_URL=<neon direct>     # usado apenas por prisma migrate
JWT_SECRET=<segredo forte>
FRONTEND_URL=http://localhost:3000
PORT=4000
OWNER_EMAIL=...
OWNER_PASSWORD=...
OWNER_NAME=...
```

## Rodando localmente
```bash
npm run dev
```
API em [http://localhost:4000](http://localhost:4000). Healthcheck: `GET /health`.

## Estrutura de Pastas
- `routes/` – rotas da API (auth, finance, category, goal, fixed-expenses, fixed-incomes, investments)
- `middleware/` – autenticação JWT
- `prisma/` – schema e migrations
- `lib/` – instância do Prisma client
- `scripts/` – seed, dump e restore do banco
- `utils/` – utilitários

## Comandos Principais
- `npm run dev` – modo desenvolvimento (nodemon)
- `npm start` – produção (`prisma generate && node index.js`)
- `npx prisma migrate dev` – aplica migrations localmente
- `npx prisma migrate deploy` – aplica migrations em produção
- `npx prisma studio` – UI do banco

## CI/CD

O workflow [`.github/workflows/build-image.yml`](.github/workflows/build-image.yml) builda a imagem Docker no GitHub Actions e publica em `ghcr.io/jvsiqueira1/gestao-backend` a cada push em `main` e em tags `v*.*.*`.

Tags geradas:
- `latest` – aponta para o último build de `main`
- `main`, `sha-<commit>` – sempre presentes
- `vX.Y.Z`, `X.Y` – quando uma tag SemVer é publicada

Após o push da imagem, um step opcional dispara o webhook de deploy do Coolify (variáveis `COOLIFY_WEBHOOK_URL` + secret `COOLIFY_TOKEN`), que puxa a imagem no VPS e reinicia o container.

## Deploy (Coolify)

1. **New Resource → Docker Image** apontando para `ghcr.io/jvsiqueira1/gestao-backend:latest`.
2. Porta `4000`, healthcheck `/health`.
3. Configure todas as env vars listadas acima.
4. Adicione um domínio (`api.<seudominio>`) — Coolify provê SSL via Let's Encrypt.
5. `prisma migrate deploy` roda automaticamente no boot do container (definido no `Dockerfile`).

## Integração com o Frontend
O frontend consome os endpoints REST do backend via `VITE_API_URL` / `NEXT_PUBLIC_API_URL`. CORS é restrito a `FRONTEND_URL` e `http://localhost:3000`.

---

> Dúvidas ou sugestões? Abra uma issue.
