-- Supabase Security Advisor: "GraphQL exposes your database to the authenticated and anonymous roles by default."
-- To secure pg_graphql, we revoke USAGE on the graphql schema from public, anon, and authenticated roles.

REVOKE ALL ON SCHEMA graphql FROM PUBLIC;
REVOKE ALL ON SCHEMA graphql FROM anon;
REVOKE ALL ON SCHEMA graphql FROM authenticated;

-- Ensure internal roles still have access
GRANT USAGE ON SCHEMA graphql TO postgres, service_role;
GRANT ALL ON FUNCTION graphql.resolve TO postgres, service_role;
