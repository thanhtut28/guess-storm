# Database Setup Guide

## Prerequisites

1. **Install PostgreSQL** on your local machine:

   -  **macOS**: `brew install postgresql`
   -  **Ubuntu/Debian**: `sudo apt-get install postgresql postgresql-contrib`
   -  **Windows**: Download from https://www.postgresql.org/download/windows/

2. **Start PostgreSQL service**:
   -  **macOS**: `brew services start postgresql`
   -  **Ubuntu/Debian**: `sudo systemctl start postgresql`
   -  **Windows**: Use the PostgreSQL service manager

## Database Setup

1. **Create a database user and database**:

   ```bash
   # Connect to PostgreSQL as superuser
   sudo -u postgres psql

   # Or on macOS:
   psql postgres

   # Create a user (replace 'username' and 'password' with your preferred credentials)
   CREATE USER username WITH PASSWORD 'password';

   # Create the database
   CREATE DATABASE storm_dashboard;

   # Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE storm_dashboard TO username;

   # Exit PostgreSQL
   \q
   ```

2. **Update your .env file** with the correct database credentials:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/storm_dashboard?schema=public"
   ```

3. **Generate Prisma client and push schema**:

   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Import the storm data**:
   ```bash
   npm run import:data
   ```

## Verification

1. **Check if data was imported successfully**:

   ```bash
   npm run db:studio
   ```

   This will open Prisma Studio in your browser where you can view the imported data.

2. **Start the development server**:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Connection Issues

-  Make sure PostgreSQL is running: `pg_isready`
-  Check if the database exists: `psql -l`
-  Verify user permissions: `psql -U username -d storm_dashboard -c "\dt"`

### Import Issues

-  Check if the `converted_storms.json` file exists in the project root
-  Ensure the database schema is up to date: `npm run db:push`
-  Check the import logs for specific error messages

### Performance

-  The initial data import may take several minutes for 1,563 storms
-  Consider increasing PostgreSQL memory settings for better performance
-  Monitor the import progress in the console output
