-- チェックリストに parent_id カラムを追加（階層構造）
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES checklists(id) ON DELETE CASCADE;
