-- Counts wrong guesses for each verification code. After 5 wrong guesses the code
-- stops working and the user has to ask for a new one.
ALTER TABLE verification_tokens
    ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
