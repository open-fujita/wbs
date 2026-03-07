export interface ChecklistTemplateDefinition {
    category: string;
    templates: {
        name: string;
        description: string;
        items: { title: string }[];
    }[];
}

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
            {
                name: 'コードレビュー',
                description: 'コードレビュー時の確認ポイント',
                items: [
                    { title: '命名規則の準拠' },
                    { title: 'エラーハンドリングの適切さ' },
                    { title: 'セキュリティ上の考慮' },
                    { title: 'パフォーマンスへの影響' },
                    { title: 'テストカバレッジの確認' },
                    { title: 'ログ出力の適切さ' },
                    { title: 'コメント・ドキュメントの充実' },
                    { title: '依存関係の確認' },
                ],
            },
            {
                name: 'セキュリティチェック',
                description: 'セキュリティ観点の確認項目',
                items: [
                    { title: 'SQLインジェクション対策' },
                    { title: 'XSS対策' },
                    { title: 'CSRF対策' },
                    { title: '認証・認可の確認' },
                    { title: '機密情報のハードコード確認' },
                    { title: '依存パッケージの脆弱性チェック' },
                ],
            },
            {
                name: 'インフラ構築',
                description: 'インフラ構築時の確認事項',
                items: [
                    { title: 'サーバー設定' },
                    { title: 'ネットワーク設定' },
                    { title: 'SSL証明書の設定' },
                    { title: 'バックアップ設定' },
                    { title: '監視設定' },
                    { title: 'ログ収集の設定' },
                    { title: 'DR手順の確認' },
                ],
            },
        ],
    },
    {
        category: '業務系',
        templates: [
            {
                name: 'プロジェクト立ち上げ',
                description: 'プロジェクト開始時の準備事項',
                items: [
                    { title: '目的・スコープの定義' },
                    { title: 'ステークホルダーの特定' },
                    { title: '体制図の作成' },
                    { title: 'スケジュールの策定' },
                    { title: '予算の確保' },
                    { title: 'リスクの洗い出し' },
                    { title: 'コミュニケーション計画' },
                    { title: 'ツールの選定' },
                    { title: 'キックオフの準備' },
                    { title: '初期ドキュメントの作成' },
                ],
            },
            {
                name: '会議準備',
                description: '会議前の準備確認リスト',
                items: [
                    { title: 'アジェンダの作成' },
                    { title: '資料の準備' },
                    { title: '参加者への連絡' },
                    { title: '会議室/ツールの確認' },
                    { title: '議事録テンプレートの準備' },
                ],
            },
            {
                name: '納品チェック',
                description: '納品前の確認項目一覧',
                items: [
                    { title: '成果物一覧の確認' },
                    { title: '品質基準の確認' },
                    { title: 'テスト結果のまとめ' },
                    { title: 'ドキュメントの最終確認' },
                    { title: '顧客レビュー依頼' },
                    { title: '納品手続きの実施' },
                ],
            },
        ],
    },
];
