/**
 * AI生成ユーティリティ
 * OpenAI API を使用（VITE_OPENAI_API_KEY が必要）
 * - マンダラチャートのサブゴール生成
 * - チェックリスト項目の自動生成
 */

import type { MandalaData } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export type GenerateSubMandalaResult =
    | { success: true; cells: MandalaData['cells'] }
    | { success: false; error: string };

const DEFAULT_LABELS = [
    '要件', '計画', 'スケジュール', '品質',
    'リソース', '成果物', 'リスク', '評価',
];

/**
 * 中心の目標から周囲8セルのサブゴールを生成
 */
export async function generateSubMandala(centerGoal: string): Promise<GenerateSubMandalaResult> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
    if (!apiKey || !apiKey.trim()) {
        return {
            success: false,
            error: 'OpenAI APIキーが設定されていません。.envにVITE_OPENAI_API_KEYを追加してください。',
        };
    }

    const trimmed = centerGoal.trim();
    if (!trimmed) {
        return {
            success: false,
            error: '中心の目標を入力してから生成してください。',
        };
    }

    const prompt = `あなたは目標設定の専門家です。マンダラチャートの中心に「${trimmed}」という目標があります。
この目標を達成するために、以下の8つの視点それぞれに対応する具体的なサブゴールを1つずつ考えてください。

視点の順番: ${DEFAULT_LABELS.join('、')}

以下のJSON形式で、8つのサブゴールを配列で返してください。各要素はその視点に対応する具体的な目標（20文字以内で簡潔に）にしてください。
{"cells": ["目標1", "目標2", "目標3", "目標4", "目標5", "目標6", "目標7", "目標8"]}

JSONのみを返し、他の説明は不要です。`;

    try {
        const res = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            }),
        });

        if (!res.ok) {
            const errBody = await res.text();
            let msg = `APIエラー (${res.status})`;
            try {
                const parsed = JSON.parse(errBody);
                if (parsed.error?.message) msg = parsed.error.message;
            } catch { /* ignore */ }
            return { success: false, error: msg };
        }

        const json = await res.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (!content) {
            return { success: false, error: 'AIからの応答が空でした。' };
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
        const cells = parsed.cells;

        if (!Array.isArray(cells) || cells.length !== 8) {
            return { success: false, error: 'AIの応答形式が不正です。' };
        }

        const normalized: MandalaData['cells'] = cells.map((c: unknown) =>
            String(c ?? '').trim().slice(0, 50)
        ) as MandalaData['cells'];

        return { success: true, cells: normalized };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            error: msg.includes('fetch') ? 'ネットワークエラー。APIキーと接続を確認してください。' : msg,
        };
    }
}

// ─── チェックリスト自動生成 ───

export type GenerateChecklistResult =
    | { success: true; title: string; items: string[] }
    | { success: false; error: string };

/**
 * 目的テキストからチェックリスト項目をAIで生成
 */
export async function generateChecklistItems(
    purpose: string,
    itemCount: number = 8,
    context?: { projectName?: string; projectCategory?: string }
): Promise<GenerateChecklistResult> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
    if (!apiKey || !apiKey.trim()) {
        return {
            success: false,
            error: 'OpenAI APIキーが設定されていません。.envにVITE_OPENAI_API_KEYを追加してください。',
        };
    }

    const trimmed = purpose.trim();
    if (!trimmed) {
        return {
            success: false,
            error: 'チェックリストの目的を入力してください。',
        };
    }

    const contextLines: string[] = [];
    if (context?.projectName) contextLines.push(`プロジェクト名: ${context.projectName}`);
    if (context?.projectCategory) contextLines.push(`プロジェクトカテゴリ: ${context.projectCategory}`);
    const contextBlock = contextLines.length > 0 ? '\n' + contextLines.join('\n') : '';

    const prompt = `あなたはプロジェクト管理の専門家です。以下の目的に対するチェックリストを作成してください。

目的: ${trimmed}${contextBlock}

以下の条件で${itemCount}個のチェック項目を生成してください:
- 各項目は具体的でアクション可能な内容にする
- 確認・検証・完了が判断できる形で記述する
- 重要度の高い順に並べる
- 各項目は30文字以内で簡潔に

以下のJSON形式で返してください:
{"title": "チェックリストのタイトル", "items": ["項目1", "項目2", ...]}

JSONのみを返し、他の説明は不要です。`;

    try {
        const res = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            }),
        });

        if (!res.ok) {
            const errBody = await res.text();
            let msg = `APIエラー (${res.status})`;
            try {
                const parsed = JSON.parse(errBody);
                if (parsed.error?.message) msg = parsed.error.message;
            } catch { /* ignore */ }
            return { success: false, error: msg };
        }

        const json = await res.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (!content) {
            return { success: false, error: 'AIからの応答が空でした。' };
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

        if (!parsed.title || !Array.isArray(parsed.items) || parsed.items.length === 0) {
            return { success: false, error: 'AIの応答形式が不正です。再生成してください。' };
        }

        const title = String(parsed.title).trim().slice(0, 100);
        const items = parsed.items.map((item: unknown) =>
            String(item ?? '').trim().slice(0, 50)
        ).filter((s: string) => s.length > 0);

        return { success: true, title, items };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            error: msg.includes('fetch') ? 'ネットワークエラー。APIキーと接続を確認してください。' : msg,
        };
    }
}
