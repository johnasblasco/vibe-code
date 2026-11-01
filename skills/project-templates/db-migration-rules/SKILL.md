---
name: db-migration-rules
description: Project rules for changing the database schema of {{project_name}}. Use whenever the user or the code needs to add, rename, or drop tables or columns, write or run a migration, seed data, change an ORM model, add an index, or touch anything in the database.
---

# Database migration rules for {{project_name}}

## Decisions on record
- Database: {{database_engine}} hosted on {{database_host}}
- ORM and migration tool: {{orm}} ({{migration_tool}})
- Pooled connection required: {{needs_pooler}}

## Rules
1. Change the schema only through the migration tool. Never edit the database by hand and never edit a migration that has already run anywhere shared.
2. Every migration has an up and a down, or a written reason why it cannot be undone.
3. Destructive changes (drop table, drop column, change type, delete data) need explicit user approval first. Prefer two steps: add the new thing, move data, then remove the old thing in a later release.
4. Every new table that holds user data gets an ownership rule (row-level security or an equivalent check) in the same migration, and a test that another user cannot read it.
5. Test the migration on a local copy first, then apply to production only when the user says so, after a fresh backup.
6. Never run migrations or ad-hoc queries against production from a local machine or from an AI session.
7. Use the pooled connection string from serverless code.

## Verify
Run migrate down then up locally. Insert, read, and delete a test row. Run the ownership test.
