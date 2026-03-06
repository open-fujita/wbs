-- マンダラチャート用データをprojectsに追加
-- 既存のSupabaseプロジェクトでエラーが出る場合、このファイルをSupabaseダッシュボード > SQL Editor で実行してください

ALTER TABLE projects ADD COLUMN IF NOT EXISTS mandala_data JSONB DEFAULT '{"center":"","cells":["","","","","","","",""]}'::jsonb;
