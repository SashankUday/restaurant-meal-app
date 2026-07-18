do $$
declare
  function_sql text;
begin
  select pg_get_functiondef('private.import_nandos_batch(jsonb)'::regprocedure)
  into function_sql;

  function_sql := replace(function_sql, 'pg_catalog.coalesce(', 'coalesce(');
  execute function_sql;
end;
$$;

revoke all on function private.import_nandos_batch(jsonb) from public, anon, authenticated;
