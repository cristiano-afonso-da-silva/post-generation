# Setup user_credits Table in Supabase

## Steps to Create the Table

1. **Go to your Supabase Dashboard**

   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**

   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**

   - Copy the contents of `supabase_migration_user_credits.sql`
   - Paste it into the SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify the Table was Created**
   - Go to "Table Editor" in the left sidebar
   - You should see `user_credits` table listed
   - Click on it to verify the columns are correct

## What This Creates

- ✅ `user_credits` table with all required columns
- ✅ Indexes for fast lookups
- ✅ Row Level Security (RLS) policies
- ✅ Automatic timestamp updates
- ✅ Foreign key constraint to `auth.users`

## Testing

After creating the table, test by:

1. Creating a new user account
2. The system should automatically create a credit record with 1 free credit
3. Check the `user_credits` table in Supabase to verify the record was created

## Troubleshooting

If you get errors:

- Make sure you're in the correct Supabase project
- Check that `auth.users` table exists (it should by default)
- Verify you have the correct permissions
