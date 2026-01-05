# Database Schema and Setup

This directory contains the master SQL scripts for the School Management System.

## Core Files

1.  **[complete_supabase_schema.sql](file:///c:/Users/USER/OneDrive/Desktop/Project/school-app-/sql/complete_supabase_schema.sql)**
    - The master schema definition.
    - Contains all table structures, extensions, and RLS bypasses.
    - Run this first to set up the database structure.

2.  **[setup_complete_system.sql](file:///c:/Users/USER/OneDrive/Desktop/Project/school-app-/sql/setup_complete_system.sql)**
    - The master data population script.
    - Populates classes, subjects (using Nigerian curriculum), and sample data.
    - Run this after the schema is created to populate the system.

## Usage Instructions

To reset or set up the database from scratch:
1. Run `complete_supabase_schema.sql` in the Supabase SQL Editor.
2. Run `setup_complete_system.sql` to populate the data.
