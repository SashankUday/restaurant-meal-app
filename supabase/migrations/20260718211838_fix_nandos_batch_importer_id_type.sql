do $$
declare
  function_sql text;
begin
  select pg_get_functiondef('private.import_nandos_batch(jsonb)'::regprocedure)
  into function_sql;

  function_sql := replace(
    function_sql,
    'pg_catalog.coalesce(pg_catalog.max(id), 0)::bigint',
    'pg_catalog.coalesce(pg_catalog.max(id), 0::bigint)'
  );

  execute function_sql;
end;
$$;

revoke all on function private.import_nandos_batch(jsonb) from public, anon, authenticated;
