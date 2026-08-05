/*
  Forward-only security hardening for the hybrid production database.

  - Restricts newsletter subscriber records to staff.
  - Fixes the search_path of any public SECURITY DEFINER function that was
    created outside the checked-in migration history without one.

  No tables, data, or existing migration files are changed.
*/

-- Newsletter subscriptions contain customer contact data. Public subscription
-- creation remains governed by anon_insert_newsletter; reading the subscriber
-- list is limited to staff when the historical policy exists. Hybrid databases
-- that do not have that policy can continue through the remaining hardening.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policy AS policy
    JOIN pg_class AS relation ON relation.oid = policy.polrelid
    JOIN pg_namespace AS schema ON schema.oid = relation.relnamespace
    WHERE schema.nspname = 'public'
      AND relation.relname = 'newsletter_subscribers'
      AND policy.polname = 'auth_select_newsletter'
  ) THEN
    ALTER POLICY "auth_select_newsletter" ON public.newsletter_subscribers
      TO authenticated
      USING (is_staff());
  END IF;
END;
$$;

-- Checked-in SECURITY DEFINER functions already set search_path. Production
-- has hybrid history, so harden any public SECURITY DEFINER function whose
-- catalog metadata does not yet include a fixed search_path. The identity
-- arguments preserve each exact signature, including overloaded functions.
DO $$
DECLARE
  function_record record;
BEGIN
  FOR function_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS config(setting)
        WHERE config.setting LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public, pg_temp',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
  END LOOP;
END;
$$;
