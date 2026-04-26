# Database Setup

## Migrations

This directory contains SQL migration files for setting up the Supabase database schema.

### Available Migrations

#### 1. `001_create_users_table.sql` - Create Users Table

Creates the main `users` table with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `full_name` | TEXT | User's full name (required) |
| `phone` | TEXT | Phone number (optional) |
| `location` | TEXT | Location/address (optional) |
| `created_at` | TIMESTAMP | Record creation timestamp (auto-set to current time) |

### How to Run Migrations

#### Option 1: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of the migration file (e.g., `001_create_users_table.sql`)
5. Paste it into the SQL editor
6. Click **Run**

#### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link your project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase migration up
```

#### Option 3: Manual SQL Execution

You can execute the SQL directly in your Supabase SQL Editor or any PostgreSQL client.

## Database Client

The Python client is located in `db_client.py` and provides methods to interact with the database:

### Users Table Methods

```python
from database.db_client import get_db

db = get_db()

# Create a user
user_data = {
    "full_name": "John Doe",
    "phone": "+55 11 98765-4321",
    "location": "São Paulo, Brazil"
}
result = db.create_user(user_data)

# Get a user
result = db.get_user("user-uuid-here")

# Update a user
updates = {"location": "Rio de Janeiro, Brazil"}
result = db.update_user("user-uuid-here", updates)

# Delete a user
result = db.delete_user("user-uuid-here")
```

## Current Tables

- **resumes**: Stores resume file metadata
- **users**: Stores user profile information
