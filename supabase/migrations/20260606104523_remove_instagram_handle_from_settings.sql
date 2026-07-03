/*
  # Remove instagram_handle column from settings

  The Instagram integration has been removed from the storefront entirely.
  This migration drops the now-unused instagram_handle column from the settings table.

  1. Modified Tables
     - `settings`: drop `instagram_handle` column (nullable text, was never required)
*/

ALTER TABLE settings DROP COLUMN IF EXISTS instagram_handle;
