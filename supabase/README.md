# Supabase セットアップ

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

## 4. SQLite からのデータインポート（既存データがある場合）

既存の wbs.db のデータを Supabase に移行する場合:

```bash
npm run import:sqlite
```

事前に .env に Supabase の設定が必要です。
