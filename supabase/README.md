# Supabase セットアップ

## OAuth認証の設定（Google / GitHub）

1. Supabaseダッシュボード > Authentication > Providers で Google または GitHub を有効化
2. 各プロバイダーのクライアントID・シークレットを設定（Google Cloud Console / GitHub Developer Settings で取得）
3. Authentication > URL Configuration で Site URL と Redirect URLs を設定:
   - Site URL: `http://localhost:5173`（開発）または本番URL
   - Redirect URLs: `http://localhost:5173/**` を追加

## 「Failed to fetch」エラーが出る場合

1. **.env の確認**: `VITE_SUPABASE_URL` が `https://xxxxx.supabase.co` の形式か確認
2. **Supabaseダッシュボード**: プロジェクトが Paused になっていないか確認（無料プランは一定期間で停止）
3. **開発サーバー再起動**: .env 変更後は `npm run dev` を再起動
4. **ネットワーク**: ファイアウォールやプロキシが Supabase をブロックしていないか確認

## 1. Supabaseプロジェクト作成

1. [Supabase](https://supabase.com) にサインアップ
2. 新規プロジェクトを作成
3. プロジェクト設定から「API」を開き、以下を取得:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

## 2. 環境変数設定

プロジェクトルートに `.env` を作成:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. データベーススキーマ適用

Supabaseダッシュボードの「SQL Editor」で以下を実行してください。

- **プロジェクトルートの `supabase-schema.sql`** を開き、内容をコピーしてSQL Editorに貼り付けて実行

（または `supabase/migrations/001_initial_schema.sql` を使用）

### 既存プロジェクトにマンダラチャートを追加する場合

「Could not find the 'mandala_data' column」エラーが出る場合、以下を SQL Editor で実行してください:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mandala_data JSONB DEFAULT '{"center":"","cells":["","","","","","","",""]}'::jsonb;
```

（または `supabase/migrations/003_add_mandala_data.sql` の内容を実行）

### 既存プロジェクトにOAuth認証を追加する場合

「Could not find the 'user_id' column」エラーが出る場合、以下を SQL Editor で実行してください:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "projects_allow_all" ON projects;
DROP POLICY IF EXISTS "wbs_tasks_allow_all" ON wbs_tasks;
DROP POLICY IF EXISTS "issues_allow_all" ON issues;
DROP POLICY IF EXISTS "issue_comments_allow_all" ON issue_comments;

CREATE POLICY "projects_user_access" ON projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wbs_tasks_user_access" ON wbs_tasks FOR ALL USING (project_code IN (SELECT project_code FROM projects WHERE user_id = auth.uid())) WITH CHECK (project_code IN (SELECT project_code FROM projects WHERE user_id = auth.uid()));
CREATE POLICY "issues_user_access" ON issues FOR ALL USING (project_code IN (SELECT project_code FROM projects WHERE user_id = auth.uid())) WITH CHECK (project_code IN (SELECT project_code FROM projects WHERE user_id = auth.uid()));
CREATE POLICY "issue_comments_user_access" ON issue_comments FOR ALL USING (issue_id IN (SELECT id FROM issues WHERE project_code IN (SELECT project_code FROM projects WHERE user_id = auth.uid()))) WITH CHECK (issue_id IN (SELECT id FROM issues WHERE project_code IN (SELECT project_code FROM projects WHERE user_id = auth.uid())));
```

（または `supabase/migrations/004_add_auth_and_rls.sql` の内容を実行）

**注意**: 既存のprojectsはuser_idがNULLのため、RLS適用後はアクセス不可になります。既存データを移行する場合、ログイン後に `auth.users` から自分のidを確認し、`UPDATE projects SET user_id = 'あなたのユーザーID' WHERE user_id IS NULL;` を実行してください。

## 4. SQLite からのデータインポート（既存データがある場合）

既存の wbs.db のデータを Supabase に移行する場合:

```bash
npm run import:sqlite
```

事前に .env に Supabase の設定が必要です。
