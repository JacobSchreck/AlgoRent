-- Clears accounts (and everything that belongs to them) before each auth test.
TRUNCATE users RESTART IDENTITY CASCADE;
