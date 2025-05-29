# Supabase本番環境設定ガイド

## 📋 本番環境用anon keyの設定方法

### ステップ1: Supabaseダッシュボードからanon keyを取得

1. **Supabaseダッシュボードにアクセス**
   ```
   https://supabase.com/dashboard
   ```

2. **プロジェクトを選択**
   - プロジェクト: `nbbivgcnvttgweycszit`

3. **API設定ページへ移動**
   - 左サイドバーの「⚙️ Settings」をクリック
   - 「🔑 API」をクリック

4. **anon keyをコピー**
   - 「Project API keys」セクション
   - 「anon public」キーをコピー
   - ⚠️ **注意**: `service_role`キーは絶対に使用しないこと

### ステップ2: アプリケーションにanon keyを設定

`lib/supabase.ts`ファイルの以下の部分を編集：

```typescript
// 本番環境用（anon keyを使用）
const prodConfig = {
  url: 'https://nbbivgcnvttgweycszit.supabase.co',
  key: 'YOUR_ANON_KEY_HERE'  // ← ここに取得したanon keyをペースト
};
```

### ステップ3: 動作確認

1. アプリを本番モードでビルド
2. 「設定確認」ボタンで環境設定を確認
3. すべてのテストが成功することを確認

## 🔐 セキュリティ設定

### 現在の設定状況

- ✅ **開発環境**: service_role key（フルアクセス）
- ⚠️ **本番環境**: anon key設定待ち

### 重要なセキュリティポイント

1. **service_role keyの使用禁止**
   - 本番環境では絶対に使用しない
   - データベースへの完全なアクセス権限を持つ

2. **anon keyの適切な使用**
   - 公開しても安全（Row Level Securityで制限）
   - クライアントサイドアプリケーション用

3. **Row Level Security (RLS)**
   - 現在有効化済み
   - anon keyでのアクセスを適切に制限

## 🧪 テスト機能

アプリの「Test」タブで以下の機能をテスト可能：

- **データベース接続テスト**: Supabaseへの基本接続
- **認証システムテスト**: Auth機能の動作確認  
- **詳細接続テスト**: REST APIエンドポイント
- **設定確認**: 現在の環境設定表示

## 📱 本番デプロイ手順

1. anon keyを設定
2. アプリをリリースモードでビルド
3. テスト機能で動作確認
4. App Store / Google Play Storeに提出

## ❓ トラブルシューティング

### 401 Unauthorized エラー
- anon keyが正しく設定されているか確認
- RLSポリシーが適切に設定されているか確認

### invalid api key エラー  
- keyの形式が正しいか確認（JWT形式）
- プロジェクトIDが一致しているか確認

## 📞 サポート

設定で問題が発生した場合：
1. まず「設定確認」ボタンで現在の状態を確認
2. テスト機能で各コンポーネントの動作を確認
3. 必要に応じてSupabaseダッシュボードでRLSポリシーを確認 