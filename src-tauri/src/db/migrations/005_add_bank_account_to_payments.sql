-- Add bank_account_id to billing_payments
ALTER TABLE billing_payments ADD COLUMN bank_account_id TEXT REFERENCES bank_accounts(id);
