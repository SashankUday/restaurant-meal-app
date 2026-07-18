do $$
declare
  function_sql text;
begin
  select pg_get_functiondef('private.import_nandos_batch(jsonb)'::regprocedure)
  into function_sql;

  function_sql := replace(
    function_sql,
    '''source_record_key'', n.source_record_key,',
    '''source_record_key'', n.source_record_key, ''source_dish_name'', coalesce(n.j->>''on'', n.j->>''n''),'
  );

  execute function_sql;
end;
$$;

revoke all on function private.import_nandos_batch(jsonb) from public, anon, authenticated;
