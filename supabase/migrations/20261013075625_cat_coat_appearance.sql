-- Optional observed appearance; never backfill from breed, name, or photo.
alter table public.cats
  add column coat_color text check (char_length(coat_color) <= 80),
  add column coat_pattern text check (char_length(coat_pattern) <= 80);
comment on column public.cats.coat_color is 'Owner-reported coat color, not a genotype';
comment on column public.cats.coat_pattern is 'Owner-reported visible pattern';
-- Existing table privileges, RLS policies and ownership triggers remain in force.
notify pgrst, 'reload schema';
-- Optional observed appearance; never backfill from breed, name, or photo.
alter table public.cats
  add column coat_color text check (char_length(coat_color) <= 80),
  add column coat_pattern text check (char_length(coat_pattern) <= 80);
comment on column public.cats.coat_color is 'Owner-reported coat color, not a genotype';
comment on column public.cats.coat_pattern is 'Owner-reported visible pattern';
-- Existing table privileges, RLS policies and ownership triggers remain in force.
notify pgrst, 'reload schema';
