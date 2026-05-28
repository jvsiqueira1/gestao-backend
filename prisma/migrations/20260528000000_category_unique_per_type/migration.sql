-- Permitir mesma label de categoria em type=expense e type=income (ex: "Outros" em ambos).
-- Constraint antiga era mais restritiva, então toda linha existente já satisfaz a nova.

DROP INDEX IF EXISTS "category_user_id_name_key";

CREATE UNIQUE INDEX "category_user_id_name_type_key"
  ON "category"("user_id", "name", "type");
