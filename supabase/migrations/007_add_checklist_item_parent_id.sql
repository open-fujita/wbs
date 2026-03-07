-- チェックリスト項目に parent_id カラムを追加（子タスク階層構造）
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES checklist_items(id) ON DELETE CASCADE;
