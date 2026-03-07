-- チェックリストにfolderカラムを追加
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT '';
