-- Minimal single-user task schema for Todo-final
-- Apply in Supabase SQL editor or via linked migration workflow.

create extension if not exists pgcrypto;

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  completed boolean not null default false,
  date date,
  important boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_todos_completed on public.todos(completed);
create index if not exists idx_todos_created_at on public.todos(created_at desc);
create index if not exists idx_todos_date on public.todos(date);
create index if not exists idx_subtasks_todo_id on public.subtasks(todo_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_todos_updated_at on public.todos;
create trigger set_todos_updated_at
before update on public.todos
for each row execute function public.set_updated_at();

drop trigger if exists set_subtasks_updated_at on public.subtasks;
create trigger set_subtasks_updated_at
before update on public.subtasks
for each row execute function public.set_updated_at();

alter table public.todos enable row level security;
alter table public.subtasks enable row level security;

drop policy if exists "todos_select_all" on public.todos;
drop policy if exists "todos_insert_all" on public.todos;
drop policy if exists "todos_update_all" on public.todos;
drop policy if exists "todos_delete_all" on public.todos;
create policy "todos_select_all"
  on public.todos for select
  using (true);
create policy "todos_insert_all"
  on public.todos for insert
  with check (true);
create policy "todos_update_all"
  on public.todos for update
  using (true)
  with check (true);
create policy "todos_delete_all"
  on public.todos for delete
  using (true);

drop policy if exists "subtasks_select_all" on public.subtasks;
drop policy if exists "subtasks_insert_all" on public.subtasks;
drop policy if exists "subtasks_update_all" on public.subtasks;
drop policy if exists "subtasks_delete_all" on public.subtasks;
create policy "subtasks_select_all"
  on public.subtasks for select
  using (true);
create policy "subtasks_insert_all"
  on public.subtasks for insert
  with check (true);
create policy "subtasks_update_all"
  on public.subtasks for update
  using (true)
  with check (true);
create policy "subtasks_delete_all"
  on public.subtasks for delete
  using (true);
