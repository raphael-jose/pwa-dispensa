-- ==================== Supabase Schema ====================
-- Run this in the Supabase SQL Editor to create the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==================== Products Table ====================
create table products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  barcode text not null,
  name text not null,
  brand text default '',
  category text default 'outros',
  quantity_unit text default 'un',
  package_size text default '',
  image_url text default '',
  ingredients text default '',
  nutritional_info text default '',
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==================== Pantry Items Table ====================
create table pantry_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity integer default 1,
  expiration_date date,
  purchase_date date,
  opened_date date,
  location text default 'despensa',
  notes text default '',
  batch_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==================== Product Batches Table ====================
create table product_batches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  pantry_item_id uuid references pantry_items(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity integer default 1,
  expiration_date date,
  purchase_date date,
  batch_number text,
  created_at timestamptz default now()
);

-- ==================== Movements Table ====================
create table movements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  pantry_item_id uuid references pantry_items(id) on delete set null,
  type text not null,
  quantity integer not null,
  date timestamptz default now(),
  notes text default '',
  created_at timestamptz default now()
);

-- ==================== Indexes ====================
create index idx_products_barcode on products(barcode);
create index idx_products_user on products(user_id);
create index idx_pantry_items_user on pantry_items(user_id);
create index idx_pantry_items_product on pantry_items(product_id);
create index idx_pantry_items_expiration on pantry_items(expiration_date);
create index idx_movements_user on movements(user_id);
create index idx_movements_date on movements(date);

-- ==================== Row Level Security ====================
alter table products enable row level security;
alter table pantry_items enable row level security;
alter table product_batches enable row level security;
alter table movements enable row level security;

-- Products policies
create policy "Users can view own products" on products
  for select using (auth.uid() = user_id);

create policy "Users can insert own products" on products
  for insert with check (auth.uid() = user_id);

create policy "Users can update own products" on products
  for update using (auth.uid() = user_id);

create policy "Users can delete own products" on products
  for delete using (auth.uid() = user_id);

-- Pantry items policies
create policy "Users can view own pantry items" on pantry_items
  for select using (auth.uid() = user_id);

create policy "Users can insert own pantry items" on pantry_items
  for insert with check (auth.uid() = user_id);

create policy "Users can update own pantry items" on pantry_items
  for update using (auth.uid() = user_id);

create policy "Users can delete own pantry items" on pantry_items
  for delete using (auth.uid() = user_id);

-- Product batches policies
create policy "Users can view own batches" on product_batches
  for select using (auth.uid() = user_id);

create policy "Users can insert own batches" on product_batches
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own batches" on product_batches
  for delete using (auth.uid() = user_id);

-- Movements policies
create policy "Users can view own movements" on movements
  for select using (auth.uid() = user_id);

create policy "Users can insert own movements" on movements
  for insert with check (auth.uid() = user_id);

-- ==================== Updated_at Trigger ====================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_products_updated_at
  before update on products
  for each row execute function update_updated_at();

create trigger update_pantry_items_updated_at
  before update on pantry_items
  for each row execute function update_updated_at();
