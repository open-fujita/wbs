# チェックリスト機能 - 実装計画書

## 1. 機能概要

プロジェクトに紐づく汎用的なチェックリスト機能を追加する。
ユーザーが自由にチェックリストを作成できるほか、あらかじめ用意されたテンプレートから一括生成も可能にする。

### コンセプト
- **汎用性**: どんな用途にも使えるチェックリスト（品質チェック、リリース準備、レビュー項目等）
- **テンプレート**: よく使うチェックリストをテンプレートとして保存・再利用
- **AI自動生成**: 目的を入力するだけでAIがチェック項目を自動生成
- **シンプルさ**: チェックボックス + タイトルを基本とし、必要に応じて詳細を追加

---

## 2. 画面イメージ

### 2.1 チェックリスト一覧画面

```
┌─────────────────────────────────────────────────────────────┐
│  チェックリスト        [+ 新規作成] [AIで生成] [テンプレから作成]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ リリース前チェックリスト              進捗: ████░░ 4/6  │   │
│  │ 作成日: 2026-03-01                                   │   │
│  │                                                     │   │
│  │  [x] コードレビュー完了                               │   │
│  │  [x] 単体テスト全パス                                 │   │
│  │  [x] 結合テスト完了                                   │   │
│  │  [x] ドキュメント更新                                 │   │
│  │  [ ] ステージング環境での動作確認                       │   │
│  │  [ ] 本番リリース承認取得                              │   │
│  │                                                     │   │
│  │  [+ 項目を追加]                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ セキュリティチェック                  進捗: ██░░░░ 2/6  │   │
│  │ 作成日: 2026-03-05                                   │   │
│  │                                                     │   │
│  │  [x] SQL インジェクション対策                          │   │
│  │  [x] XSS 対策                                       │   │
│  │  [ ] CSRF 対策                                      │   │
│  │  [ ] 認証・認可の確認                                 │   │
│  │  [ ] 機密情報のハードコード確認                        │   │
│  │  [ ] 依存パッケージの脆弱性チェック                    │   │
│  │                                                     │   │
│  │  [+ 項目を追加]                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 新規作成ダイアログ

```
┌──────────────────────────────────────────┐
│  新しいチェックリストを作成               │
│                                          │
│  タイトル: [                           ]  │
│  説明:     [                           ]  │
│                                          │
│           [キャンセル]  [作成]             │
└──────────────────────────────────────────┘
```

### 2.3 AI自動生成ダイアログ

```
┌──────────────────────────────────────────────────────────┐
│  AIでチェックリストを自動生成                              │
│                                                          │
│  何のチェックリストを作りますか？                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │ React SPAアプリのリリース前に確認すべき項目        │    │
│  │                                                  │    │
│  │                                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  生成する項目数:  [ 8 ▼]                                  │
│                                                          │
│  ── 生成プレビュー ──                                     │
│  ┌──────────────────────────────────────────────────┐    │
│  │ タイトル: React SPAリリース前チェック               │    │
│  │                                                  │    │
│  │  [ ] TypeScriptの型エラーがないことを確認           │    │
│  │  [ ] ESLint/Prettierの警告を解消                   │    │
│  │  [ ] 全テストスイートの通過を確認                    │    │
│  │  [ ] バンドルサイズの確認と最適化                    │    │
│  │  [ ] 環境変数の本番設定を確認                       │    │
│  │  [ ] APIエンドポイントの本番URLを確認                │    │
│  │  [ ] OGP/メタタグの設定確認                        │    │
│  │  [ ] ブラウザ互換性テスト                           │    │
│  │                                                  │    │
│  │  [項目を編集して調整可能]                           │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ※ VITE_OPENAI_API_KEY が必要です                        │
│                                                          │
│           [キャンセル]  [再生成]  [このまま作成]            │
└──────────────────────────────────────────────────────────┘
```

**AI生成フロー:**
1. ユーザーが目的・用途をテキストで入力（自由記述）
2. 生成する項目数を選択（5/8/10/15、デフォルト8）
3. 「生成」ボタンでOpenAI APIに送信
4. プレビュー表示 → 項目の追加・削除・編集が可能
5. 「このまま作成」で確定、チェックリストとして保存

**プロンプト設計:**
- プロジェクト名・カテゴリをコンテキストとして付与
- 具体的・アクション可能な項目を生成するよう指示
- JSON形式で返却させる（既存のマンダラチャートAI生成パターンに準拠）

### 2.4 テンプレート選択ダイアログ

```
┌──────────────────────────────────────────────────┐
│  テンプレートからチェックリストを作成              │
│                                                  │
│  ── システム系 ──                                 │
│  ┌──────────────────────────────────────────┐    │
│  │ リリース前チェック              6項目      │    │
│  │ リリース前に確認すべき項目一覧              │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │ コードレビューチェック          8項目      │    │
│  │ コードレビュー時の確認ポイント              │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │ セキュリティチェック            6項目      │    │
│  │ セキュリティ観点の確認項目                  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ── 業務系 ──                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ プロジェクト立ち上げ           10項目      │    │
│  │ プロジェクト開始時の準備事項                │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │ 会議準備チェック                5項目      │    │
│  │ 会議前の準備確認リスト                     │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ── カスタムテンプレート ──                        │
│  ┌──────────────────────────────────────────┐    │
│  │ (ユーザーが保存したテンプレート)            │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │ [+ 現在のチェックリストをテンプレとして保存] │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│           [キャンセル]                            │
└──────────────────────────────────────────────────┘
```

### 2.5 チェックリスト項目の操作

```
各項目のホバー時:
┌──────────────────────────────────────────────────┐
│  [x] コードレビュー完了            [編集] [削除]  │
└──────────────────────────────────────────────────┘

項目の編集モード:
┌──────────────────────────────────────────────────┐
│  [x] [コードレビュー完了を入力中...  ] [保存]     │
└──────────────────────────────────────────────────┘

ドラッグで並び替え:
┌──────────────────────────────────────────────────┐
│  ⠿ [x] コードレビュー完了           ← ドラッグ   │
│  ⠿ [ ] 単体テスト全パス                          │
│  ⠿ [x] 結合テスト完了                            │
└──────────────────────────────────────────────────┘
```

---

## 3. データベース設計

### 3.1 新規テーブル

#### checklists（チェックリスト）

```sql
CREATE TABLE IF NOT EXISTS checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for checklists" ON checklists FOR ALL USING (true);
CREATE TRIGGER update_checklists_updated_at
    BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

#### checklist_items（チェックリスト項目）

```sql
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    is_completed BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for checklist_items" ON checklist_items FOR ALL USING (true);
CREATE TRIGGER update_checklist_items_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

#### checklist_templates（チェックリストテンプレート）

```sql
CREATE TABLE IF NOT EXISTS checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'カスタム',
    items JSONB DEFAULT '[]',
    is_builtin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for checklist_templates" ON checklist_templates FOR ALL USING (true);
CREATE TRIGGER update_checklist_templates_updated_at
    BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 ER図（追加分）

```
┌─────────────┐       ┌──────────────────┐
│  projects   │1    N │   checklists     │
│─────────────│───────│──────────────────│
│ project_code│◄──────│ project_code     │
│ ...         │       │ title            │
└─────────────┘       │ description      │
                      │ sort_order       │
                      └────────┬─────────┘
                               │ 1
                               │
                               │ N
                      ┌────────▼─────────┐
                      │ checklist_items   │
                      │──────────────────│
                      │ checklist_id (FK) │
                      │ title            │
                      │ is_completed     │
                      │ sort_order       │
                      └──────────────────┘

┌──────────────────────┐
│ checklist_templates  │
│──────────────────────│
│ user_id (FK)         │
│ name                 │
│ category             │
│ items (JSONB)        │  ← [{"title": "項目1"}, {"title": "項目2"}, ...]
│ is_builtin           │
└──────────────────────┘
```

---

## 4. TypeScript型定義

```typescript
// チェックリスト
export interface Checklist {
  id: string;
  projectCode: string;
  title: string;
  description: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// チェックリスト項目
export interface ChecklistItem {
  id: string;
  checklistId: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// テンプレート
export interface ChecklistTemplate {
  id: string;
  userId?: string;
  name: string;
  description: string;
  category: string;
  items: { title: string }[];
  isBuiltin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// PageType に追加
export type PageType = 'project-overview' | 'wbs' | 'issues' | 'wiki' | 'mandala' | 'checklist';
```

---

## 5. 実装計画（フェーズ分け）

### Phase 1: データ層（基盤）

| # | タスク | ファイル | 概要 |
|---|--------|---------|------|
| 1-1 | DB スキーマ追加 | `supabase-schema.sql` | 3テーブル（checklists, checklist_items, checklist_templates）追加 |
| 1-2 | 型定義追加 | `src/types.ts` | Checklist, ChecklistItem, ChecklistTemplate インターフェース追加 |
| 1-3 | CRUD フック作成 | `src/hooks/useChecklists.ts` | チェックリスト＆項目のCRUD操作（useIssuesパターン準拠） |

### Phase 2: UIコンポーネント（コア画面）

| # | タスク | ファイル | 概要 |
|---|--------|---------|------|
| 2-1 | メインビュー | `src/components/ChecklistView.tsx` | チェックリスト一覧表示、作成、展開/折りたたみ |
| 2-2 | スタイル | `src/components/ChecklistView.css` | V0ライクなデザイン |
| 2-3 | ページ統合 | `src/App.tsx` | useChecklists呼び出し、ChecklistViewの条件レンダリング追加 |
| 2-4 | ナビ追加 | `src/components/Sidebar.tsx` | サイドバーに「チェックリスト」ボタン追加 |

### Phase 3: インタラクション（操作性）

| # | タスク | ファイル | 概要 |
|---|--------|---------|------|
| 3-1 | チェック切替 | `ChecklistView.tsx` | チェックボックスのトグル、進捗バー表示 |
| 3-2 | インライン編集 | `ChecklistView.tsx` | 項目タイトルのクリック編集 |
| 3-3 | 項目追加 | `ChecklistView.tsx` | 「+ 項目を追加」のインライン入力 |
| 3-4 | 項目削除 | `ChecklistView.tsx` | ホバー時の削除ボタン |
| 3-5 | ドラッグ並替 | `ChecklistView.tsx` | @dnd-kitによる項目の並び替え |

### Phase 4: テンプレート機能

| # | タスク | ファイル | 概要 |
|---|--------|---------|------|
| 4-1 | 組み込みテンプレート | `src/lib/checklistTemplates.ts` | プリセットテンプレート定義 |
| 4-2 | テンプレート選択UI | `src/components/ChecklistTemplateModal.tsx` | テンプレート一覧・選択ダイアログ |
| 4-3 | テンプレート保存 | `useChecklists.ts` | 既存チェックリストをテンプレートとして保存 |
| 4-4 | テンプレートCRUD | `useChecklists.ts` | カスタムテンプレートの管理（編集・削除） |

### Phase 5: AI自動生成機能

| # | タスク | ファイル | 概要 |
|---|--------|---------|------|
| 5-1 | AI生成関数 | `src/lib/aiGenerate.ts` | `generateChecklistItems()` 関数を追加（既存ファイルに追記） |
| 5-2 | AI生成ダイアログ | `src/components/ChecklistAIModal.tsx` | 目的入力・項目数選択・プレビュー・編集UI |
| 5-3 | AI生成ダイアログスタイル | `src/components/ChecklistAIModal.css` | ダイアログスタイル |
| 5-4 | フック統合 | `src/hooks/useChecklists.ts` | `createFromAI()` メソッド追加 |
| 5-5 | ボタン追加 | `src/components/ChecklistView.tsx` | ヘッダーに「AIで生成」ボタン追加 |

---

## 6. テンプレート仕様

### 6.1 組み込みテンプレート（プリセット）

アプリに組み込まれた読み取り専用テンプレート。`src/lib/checklistTemplates.ts`にハードコードする。

#### システム系

| テンプレート名 | 項目数 | 項目例 |
|--------------|-------|--------|
| リリース前チェック | 6 | コードレビュー完了、単体テスト全パス、結合テスト完了、ドキュメント更新、ステージング確認、本番リリース承認 |
| コードレビュー | 8 | 命名規則の準拠、エラーハンドリング、セキュリティ考慮、パフォーマンス、テストカバレッジ、ログ出力、コメント・ドキュメント、依存関係の確認 |
| セキュリティチェック | 6 | SQLインジェクション対策、XSS対策、CSRF対策、認証・認可確認、機密情報ハードコード確認、脆弱性チェック |
| インフラ構築 | 7 | サーバー設定、ネットワーク設定、SSL証明書、バックアップ設定、監視設定、ログ収集、DR手順確認 |

#### 業務系

| テンプレート名 | 項目数 | 項目例 |
|--------------|-------|--------|
| プロジェクト立ち上げ | 10 | 目的・スコープ定義、ステークホルダー特定、体制図作成、スケジュール策定、予算確保、リスク洗い出し、コミュニケーション計画、ツール選定、キックオフ準備、初期ドキュメント作成 |
| 会議準備 | 5 | アジェンダ作成、資料準備、参加者への連絡、会議室/ツール確認、議事録テンプレート準備 |
| 納品チェック | 6 | 成果物一覧確認、品質基準の確認、テスト結果まとめ、ドキュメント最終確認、顧客レビュー依頼、納品手続き |

### 6.2 カスタムテンプレート（ユーザー作成）

- 既存のチェックリストから「テンプレートとして保存」で作成
- `checklist_templates`テーブルに`user_id`付きで保存
- `is_builtin = false`でカスタムテンプレートを識別
- 編集・削除可能

### 6.3 テンプレートデータ構造

```typescript
// 組み込みテンプレート定義
export const BUILTIN_CHECKLIST_TEMPLATES: ChecklistTemplateDefinition[] = [
  {
    category: 'システム系',
    templates: [
      {
        name: 'リリース前チェック',
        description: 'リリース前に確認すべき項目一覧',
        items: [
          { title: 'コードレビュー完了' },
          { title: '単体テスト全パス' },
          { title: '結合テスト完了' },
          { title: 'ドキュメント更新' },
          { title: 'ステージング環境での動作確認' },
          { title: '本番リリース承認取得' },
        ],
      },
      // ... 他テンプレート
    ],
  },
  // ... 他カテゴリ
];
```

---

## 7. AI自動生成仕様

### 7.1 概要

既存の `src/lib/aiGenerate.ts`（マンダラチャート用）に、チェックリスト生成関数を追加する。
同じOpenAI API呼び出しパターン（gpt-4o-mini、JSON応答）を踏襲し、一貫性を保つ。

### 7.2 API関数

```typescript
// src/lib/aiGenerate.ts に追加

export type GenerateChecklistResult =
    | { success: true; title: string; items: string[] }
    | { success: false; error: string };

export async function generateChecklistItems(
    purpose: string,
    itemCount: number,
    context?: { projectName?: string; projectCategory?: string }
): Promise<GenerateChecklistResult>;
```

### 7.3 プロンプト設計

```
あなたはプロジェクト管理の専門家です。以下の目的に対する
チェックリストを作成してください。

目的: ${purpose}
${projectName ? `プロジェクト名: ${projectName}` : ''}
${projectCategory ? `プロジェクトカテゴリ: ${projectCategory}` : ''}

以下の条件で${itemCount}個のチェック項目を生成してください:
- 各項目は具体的でアクション可能な内容にする
- 確認・検証・完了が判断できる形で記述する
- 重要度の高い順に並べる
- 各項目は30文字以内で簡潔に

以下のJSON形式で返してください:
{"title": "チェックリストのタイトル", "items": ["項目1", "項目2", ...]}

JSONのみを返し、他の説明は不要です。
```

### 7.4 レスポンス処理

```typescript
// 期待するレスポンス形式
{
  "title": "React SPAリリース前チェック",
  "items": [
    "TypeScriptの型エラーがないことを確認",
    "ESLint/Prettierの警告を解消",
    "全テストスイートの通過を確認",
    ...
  ]
}
```

- JSONの抽出: 正規表現 `/\{[\s\S]*\}/` でJSON部分を抽出（マンダラと同方式）
- バリデーション: `title`が文字列、`items`が文字列配列であることを検証
- 文字数制限: 各項目を50文字で切り詰め
- エラーハンドリング: APIキー未設定、ネットワークエラー、不正レスポンスに対応

### 7.5 UIフロー

```
[AIで生成] ボタンクリック
    │
    ▼
┌─────────────────────────┐
│  ChecklistAIModal       │
│                         │
│  1. 目的テキスト入力     │
│  2. 項目数選択（5-15）   │
│  3. [生成] ボタン        │
│         │               │
│         ▼               │
│  ローディング表示        │
│  (スピナー + メッセージ)  │
│         │               │
│         ▼               │
│  4. プレビュー表示       │
│     - タイトル編集可能   │
│     - 各項目の編集可能   │
│     - 項目の追加/削除可  │
│     - [再生成] で再試行  │
│         │               │
│         ▼               │
│  5. [このまま作成] 確定  │
└─────────────────────────┘
    │
    ▼
チェックリスト作成
（useChecklists.createFromAI）
```

### 7.6 エラー処理

| エラー | メッセージ | 対応 |
|--------|----------|------|
| APIキー未設定 | 「OpenAI APIキーが設定されていません」 | .envへの設定手順を案内 |
| 目的未入力 | 「チェックリストの目的を入力してください」 | 入力欄をフォーカス |
| API通信エラー | 「ネットワークエラー。接続を確認してください」 | リトライボタン表示 |
| レスポンス不正 | 「AIの応答形式が不正です。再生成してください」 | 再生成ボタン表示 |
| レート制限 | APIエラーメッセージをそのまま表示 | 時間を置いてリトライ |

### 7.7 設定要件

- 既存の `VITE_OPENAI_API_KEY` 環境変数を共用（マンダラチャートと同じ）
- モデル: `gpt-4o-mini`（コスト効率重視）
- Temperature: `0.7`（適度な多様性）
- 新規の環境変数は不要

---

## 8. コンポーネント構成

```
App.tsx
├── useChecklists(projectCode)     ← 新規フック
│
└── ChecklistView                  ← メインコンポーネント
    ├── ヘッダー（タイトル + [新規作成] [AIで生成] [テンプレから作成]）
    ├── チェックリストカード（複数）
    │   ├── カードヘッダー（タイトル、進捗バー、操作メニュー）
    │   ├── チェックリスト項目（複数）
    │   │   ├── チェックボックス
    │   │   ├── タイトル（クリックで編集）
    │   │   └── 削除ボタン（ホバー表示）
    │   └── 項目追加フォーム
    ├── ChecklistTemplateModal     ← テンプレート選択モーダル
    │   ├── カテゴリグループ
    │   │   └── テンプレートカード
    │   └── カスタムテンプレート保存ボタン
    └── ChecklistAIModal           ← AI自動生成モーダル
        ├── 目的入力テキストエリア
        ├── 項目数セレクト（5/8/10/15）
        ├── 生成ボタン + ローディング
        ├── プレビュー（タイトル・項目の編集可能）
        └── [再生成] / [このまま作成] ボタン
```

---

## 8. API・フック設計

### useChecklists(projectCode)

```typescript
{
  // データ
  checklists: Checklist[];
  items: Record<string, ChecklistItem[]>;  // checklistId -> items[]
  templates: ChecklistTemplate[];
  loading: boolean;

  // チェックリストCRUD
  createChecklist: (title: string, description?: string) => Promise<Checklist | null>;
  updateChecklist: (id: string, updates: Partial<Checklist>) => Promise<void>;
  deleteChecklist: (id: string) => Promise<void>;

  // 項目CRUD
  addItem: (checklistId: string, title: string) => Promise<ChecklistItem | null>;
  updateItem: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  reorderItems: (checklistId: string, itemIds: string[]) => Promise<void>;

  // テンプレート
  createFromTemplate: (template: ChecklistTemplate | BuiltinTemplate) => Promise<void>;
  saveAsTemplate: (checklistId: string, name: string, category?: string) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;

  // AI自動生成
  createFromAI: (title: string, items: { title: string }[]) => Promise<Checklist | null>;
}
```

---

## 9. 修正対象ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `supabase-schema.sql` | 追記 | 3テーブル追加 |
| `src/types.ts` | 追記 | 型定義追加、PageType拡張 |
| `src/hooks/useChecklists.ts` | 新規 | CRUDフック |
| `src/lib/checklistTemplates.ts` | 新規 | 組み込みテンプレート定義 |
| `src/components/ChecklistView.tsx` | 新規 | メイン画面 |
| `src/components/ChecklistView.css` | 新規 | スタイル |
| `src/components/ChecklistTemplateModal.tsx` | 新規 | テンプレート選択ダイアログ |
| `src/components/ChecklistTemplateModal.css` | 新規 | ダイアログスタイル |
| `src/components/ChecklistAIModal.tsx` | 新規 | AI自動生成ダイアログ |
| `src/components/ChecklistAIModal.css` | 新規 | AI生成ダイアログスタイル |
| `src/lib/aiGenerate.ts` | 追記 | `generateChecklistItems()` 関数追加 |
| `src/App.tsx` | 修正 | フック呼出し、ルーティング追加 |
| `src/components/Sidebar.tsx` | 修正 | ナビゲーション項目追加 |

---

## 10. デザイン方針

- 既存のV0ライクなデザインに統一（白背景、モノクローム、ミニマル）
- 進捗バーは完了数/全体数で表示（グリーン系グラデーション）
- チェックボックスは完了時にストライクスルー + テキスト色を薄く
- カードはborder + 角丸のシンプルなスタイル
- @dnd-kitの既存パターン（WBSTable）に合わせたDnD実装
