-- Row-Level Security via session variable app.current_user_id.
--
-- Cada request autenticado executa SET LOCAL app.current_user_id = <id> dentro
-- de uma transação Prisma; policies abaixo comparam a coluna user_id da linha
-- contra esse valor. FORCE garante que o owner do role também é filtrado.
--
-- Tabelas sem RLS (intencional):
--   * users — login/register são pré-autenticação; restringido pelo OWNER_EMAIL lock no app
--   * password_reset_token — lookup por `token` opaco antes de haver user_id na sessão
--
-- Migrations rodam DDL apenas, então não precisam do setting estar definido.
-- Scripts (seed/backfill) chamam SET app.current_user_id antes de DML.

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS integer
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::int
$$;

-- CATEGORY
ALTER TABLE "category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category" FORCE ROW LEVEL SECURITY;
CREATE POLICY category_isolation ON "category"
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- EXPENSE
ALTER TABLE "expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense" FORCE ROW LEVEL SECURITY;
CREATE POLICY expense_isolation ON "expense"
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- INCOME
ALTER TABLE "income" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "income" FORCE ROW LEVEL SECURITY;
CREATE POLICY income_isolation ON "income"
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- FINANCIAL GOAL (sem @@map — nome do model preservado em PascalCase)
ALTER TABLE "FinancialGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialGoal" FORCE ROW LEVEL SECURITY;
CREATE POLICY financial_goal_isolation ON "FinancialGoal"
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- INVESTMENT
ALTER TABLE "investment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investment" FORCE ROW LEVEL SECURITY;
CREATE POLICY investment_isolation ON "investment"
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- INVESTMENT TRANSACTION
ALTER TABLE "investment_transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investment_transaction" FORCE ROW LEVEL SECURITY;
CREATE POLICY investment_transaction_isolation ON "investment_transaction"
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- VALUATION
ALTER TABLE "valuation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "valuation" FORCE ROW LEVEL SECURITY;
CREATE POLICY valuation_isolation ON "valuation"
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
