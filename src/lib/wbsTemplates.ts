/**
 * WBS自動生成用テンプレート（サーバーから移行）
 */
export type WBSTemplate = { category: string; tasks: string[] }[];

export const WBS_TEMPLATES: Record<string, WBSTemplate> = {
    'システム企画': [
        { category: '現状分析', tasks: ['業務フロー分析', '課題整理', '要件ヒアリング'] },
        { category: '企画立案', tasks: ['基本構想策定', '概算見積', '投資対効果分析'] },
        { category: '提案', tasks: ['提案書作成', 'ステークホルダー説明', '承認取得'] },
        { category: '要件定義', tasks: ['機能要件定義', '非機能要件定義', '要件レビュー'] },
    ],
    'システム導入': [
        { category: '要件定義', tasks: ['要件ヒアリング', '要件定義書作成', '要件確定'] },
        { category: '設計', tasks: ['基本設計', '詳細設計', '設計レビュー'] },
        { category: '開発/構築', tasks: ['環境構築', '開発/設定', '単体テスト'] },
        { category: 'テスト', tasks: ['結合テスト', 'ユーザ受入テスト', '性能テスト'] },
        { category: '移行', tasks: ['データ移行', '並行運用', '本番切替'] },
        { category: '運用定着', tasks: ['操作研修', 'マニュアル整備', '運用引継ぎ'] },
    ],
    '新規事業企画': [
        { category: '市場調査', tasks: ['市場分析', '競合調査', 'ターゲット分析'] },
        { category: '事業計画', tasks: ['ビジネスモデル設計', '収支計画', 'リスク分析'] },
        { category: '検証', tasks: ['POC/MVP開発', '検証実施', '結果分析'] },
        { category: '準備', tasks: ['体制構築', 'パートナー選定', '法務対応'] },
        { category: '立ち上げ', tasks: ['プレローンチ', '本格ローンチ', '効果測定'] },
    ],
    'トラブル対応': [
        { category: '初動対応', tasks: ['状況把握', '影響範囲特定', '暫定対応'] },
        { category: '原因調査', tasks: ['ログ分析', '原因特定', '再現確認'] },
        { category: '恒久対策', tasks: ['対策立案', '対策実施', '動作確認'] },
        { category: '再発防止', tasks: ['原因分析(なぜなぜ)', '再発防止策策定', '水平展開'] },
        { category: '報告', tasks: ['報告書作成', '関係者報告', 'ナレッジ化'] },
    ],
    'その他': [
        { category: '企画', tasks: ['要件定義', '企画書作成', '承認プロセス'] },
        { category: '設計', tasks: ['基本設計', '詳細設計', 'デザインレビュー'] },
        { category: '実行', tasks: ['環境準備', '実施', 'レビュー'] },
        { category: '検証', tasks: ['テスト計画', 'テスト実施', '改善対応'] },
        { category: '完了', tasks: ['成果物整理', '報告', '振り返り'] },
    ],
};

export function getPhaseWeights(category: string, phaseCount: number): number[] {
    switch (category) {
        case 'システム企画':
            return [3, 3, 2, 2];
        case 'システム導入':
            return [2, 3, 4, 3, 2, 2];
        case '新規事業企画':
            return [3, 3, 3, 2, 2];
        case 'トラブル対応':
            return [1, 3, 3, 2, 1];
        default:
            return Array(phaseCount).fill(1);
    }
}
