-- Create a table for storing leads/emails
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  source text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.leads enable row level security;

-- Create policy to allow anyone to insert (for public facing form)
create policy "Enable insert for all users" on public.leads
  for insert with check (true);

-- Create policy to allow only authenticated users (admins) to view
create policy "Enable read access for authenticated users only" on public.leads
  for select using (auth.role() = 'authenticated');










