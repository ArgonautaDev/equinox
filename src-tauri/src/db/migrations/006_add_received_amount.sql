-- Add received_amount to billing_payments
ALTER TABLE billing_payments ADD COLUMN received_amount REAL;

-- Backfill existing payments (assuming 1:1 for now as we can't guess history)
UPDATE billing_payments SET received_amount = amount WHERE received_amount IS NULL;
