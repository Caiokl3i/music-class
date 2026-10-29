-- ==============================================================================
-- Music Class V2 — Staging PII Anonymization Script
-- ==============================================================================
-- Masks personal identifiable information (PII) in a restored Staging database
-- while preserving 100% of primary/foreign keys, row counts, dates required for
-- scheduling rules, and financial totals (SUM(price), SUM(amount)).
--
-- NEVER run this script against the Production database!
-- ==============================================================================

BEGIN;

UPDATE public.users
SET
  full_name = 'Professor Staging #' || id,
  email = 'professor.' || id || '@staging.musicclass.local',
  phone = CASE
    WHEN phone IS NOT NULL THEN '(11) 90000-' || LPAD((id % 10000)::text, 4, '0')
    ELSE NULL
  END,
  studio_name = CASE
    WHEN studio_name IS NOT NULL THEN 'Estúdio Homologação #' || id
    ELSE NULL
  END,
  city = CASE
    WHEN city IS NOT NULL THEN 'São Paulo'
    ELSE NULL
  END,
  bio = CASE
    WHEN bio IS NOT NULL THEN 'Conta anonimizada automaticamente para Staging.'
    ELSE NULL
  END;

UPDATE public.students
SET
  name = 'Aluno Staging #' || id,
  phone = CASE
    WHEN phone IS NOT NULL THEN '(11) 98888-' || LPAD((id % 10000)::text, 4, '0')
    ELSE NULL
  END,
  birthdate = CASE
    WHEN birthdate IS NOT NULL THEN DATE '2000-01-01'
    ELSE NULL
  END,
  description = CASE
    WHEN description IS NOT NULL THEN 'Observação pedagógica anonimizada (Staging).'
    ELSE NULL
  END,
  tags = CASE
    WHEN tags IS NOT NULL THEN 'staging'
    ELSE NULL
  END;

UPDATE public.plans
SET
  notes = CASE
    WHEN notes IS NOT NULL THEN 'Nota financeira anonimizada (Staging).'
    ELSE NULL
  END;

UPDATE public.lessons
SET
  description = CASE
    WHEN description IS NOT NULL THEN 'Anotação de aula anonimizada (Staging).'
    ELSE NULL
  END;

UPDATE public.plan_discounts
SET
  notes = CASE
    WHEN notes IS NOT NULL THEN 'Observação de desconto anonimizada (Staging).'
    ELSE NULL
  END;

COMMIT;

