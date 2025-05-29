import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';
import uuid from 'react-native-uuid';
import { Platform } from 'react-native';

// WebSocketを使用しないようにSupabaseを設定
if (Platform.OS !== 'web') {
  // React Native環境ではWebSocketライブラリを無効化
  (global as any).WebSocket = undefined;
}

// 環境に応じたSupabase設定
const getSupabaseConfig = () => {
  // 開発環境用（現在のテスト設定）
  const devConfig = {
    url: 'https://nbbivgcnvttgweycszit.supabase.co',
    // 一時的にservice_role_keyを使用（テスト目的のみ）
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iYml2Z2NudnR0Z3dleWNzeml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODA2NjE2MCwiZXhwIjoyMDYzNjQyMTYwfQ.fik_aWU6_8eifZsaBpzj1fpToNJtx2J4Dq6utGkyph0'
  };

  // 本番環境用（anon keyを使用）
  const prodConfig = {
    url: 'https://nbbivgcnvttgweycszit.supabase.co',
    // 実際のanon keyに置き換えてください
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iYml2Z2NudnR0Z3dleWNzeml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjYxNjAsImV4cCI6MjA2MzY0MjE2MH0.QpIzSK4lrh1Z6S6c22MlXFaKSc-UVuN3ZRK3kInEFHc'
  };

  // 開発モードかどうかを判定（__DEV__はReact Nativeの開発フラグ）
  // 一時的にanon keyを使用してテスト
  return prodConfig;
};

const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig();

// SecureStore adapter for Supabase Auth
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    // WebSocketの問題を回避するためrealtimeを無効化
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    // React Native環境に適したフェッチ設定
    fetch: globalThis.fetch,
    headers: {
      'X-Client-Info': 'supabase-js-react-native'
    }
  },
  db: {
    schema: 'public'
  }
});

// Anonymous ID management
const ANONYMOUS_ID_KEY = 'anonymous_user_id';

export const getAnonymousId = async (): Promise<string> => {
  try {
    let anonymousId: string | null = null;
    
    if (Platform.OS !== 'web') {
      anonymousId = await SecureStore.getItemAsync(ANONYMOUS_ID_KEY);
    } else {
      anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
    }
    
    if (!anonymousId) {
      anonymousId = uuid.v4().toString();
      
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(ANONYMOUS_ID_KEY, anonymousId);
      } else {
        localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
      }
    }
    
    return anonymousId;
  } catch (error) {
    console.error('Error getting anonymous ID:', error);
    // Fallback to a new ID if there's an error
    return uuid.v4().toString();
  }
};

// 設定確認用のエクスポート
export const getSupabaseInfo = () => ({
  url: supabaseUrl,
  keyType: __DEV__ ? 'service_role (開発用)' : 'anon (本番用)',
  isDev: __DEV__
});

// URLとキーを直接エクスポート
export const getSupabaseCredentials = () => ({
  url: supabaseUrl,
  key: supabaseAnonKey
});