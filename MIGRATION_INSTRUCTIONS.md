# Database Migration Required

## Add Account Name and Website Columns to Generations Table

You need to run this migration in your Supabase SQL Editor to fix the error:
"Could not find the 'account_name' column of 'generations' in the schema cache"

### Steps:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the following SQL:

```sql
-- Add account_name and website columns to generations table
-- These fields store the user's account handle and website for use in carousel footers

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS account_name TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Note: Both columns are nullable (optional fields)
-- RLS policies already exist on generations table, so no additional policies needed
```

5. Click **Run** to execute the migration
6. Verify the migration succeeded (you should see "Success. No rows returned")

### Verification:

After running the migration, you can verify it worked by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'generations' 
AND column_name IN ('account_name', 'website');
```

You should see both columns listed.

