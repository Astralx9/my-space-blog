alter table media_files
  add column if not exists width integer,
  add column if not exists height integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'media_files_dimensions_check'
  ) then
    alter table media_files
      add constraint media_files_dimensions_check
      check (
        (width is null and height is null)
        or (width between 1 and 50000 and height between 1 and 50000)
      );
  end if;
end $$;
