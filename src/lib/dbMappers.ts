/**
 * Supabase (snake_case) と フロントエンド (camelCase) の変換
 */

export function toCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
        const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        result[camel] = v;
    }
    return result;
}

export function toSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        const snake = k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
        result[snake] = v;
    }
    return result;
}
