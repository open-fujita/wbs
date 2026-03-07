-- チェックリスト機能追加マイグレーション
-- Supabase ダッシュボード > SQL Editor でこの内容を実行してください

-- チェックリスト
CREATE TABLE IF NOT EXISTS checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT NOT NULL DEFAULT '',
    folder TEXT DEFAULT '',
    parent_id UUID REFERENCES checklists(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- チェックリスト項目
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES checklist_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    is_completed BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- チェックリストテンプレート
CREATE TABLE IF NOT EXISTS checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'カスタム',
    items JSONB DEFAULT '[]'::jsonb,
    is_builtin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 権限付与
GRANT ALL ON checklists TO anon;
GRANT ALL ON checklist_items TO anon;
GRANT ALL ON checklist_templates TO anon;

-- RLS有効化
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "checklists_allow_all" ON checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "checklist_items_allow_all" ON checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "checklist_templates_allow_all" ON checklist_templates FOR ALL USING (true) WITH CHECK (true);

-- updated_at自動更新トリガー（update_updated_at関数は既存）
CREATE TRIGGER checklists_updated_at
    BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER checklist_items_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER checklist_templates_updated_at
    BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
