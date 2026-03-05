import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function createSupabaseClient(): SupabaseClient {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Supabaseの設定がありません。.env.exampleを参考に.envを作成し、VITE_SUPABASE_URLとVITE_SUPABASE_ANON_KEYを設定してください。'
        );
    }
    return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();
