import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, getSupabaseInfo } from '@/lib/supabase';

export default function SupabaseTestScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  
  // Supabase設定情報を表示
  const showConfig = () => {
    const config = getSupabaseInfo();
    setTestResult(`URL: ${config.url}\nキータイプ: ${config.keyType}\n開発モード: ${config.isDev ? 'はい' : 'いいえ'}\nセキュリティレベル: ${config.isDev ? '開発用（フルアクセス）' : '本番用（制限付き）'}`);
  };

  const testSupabaseConnection = async () => {
    setIsLoading(true);
    setTestResult('接続をテスト中...');
    
    try {
      // Supabaseのヘルスチェック - articlesテーブルを使用
      const { data, error } = await supabase
        .from('articles')
        .select('count')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST116') {
          setTestResult('✅ Supabase接続成功！（articlesテーブルが見つかりません）');
        } else if (error.message.includes('permission denied') || error.message.includes('RLS')) {
          setTestResult('✅ Supabase接続成功！（RLSにより制限されていますが接続は正常です）');
        } else {
          setTestResult(`❌ エラー: ${error.message} (コード: ${error.code})`);
        }
      } else {
        setTestResult('✅ Supabase接続成功！articlesテーブルにアクセスできました');
      }
    } catch (error: any) {
      if (error.message.includes('fetch')) {
        setTestResult('❌ ネットワークエラー: インターネット接続を確認してください');
      } else {
        setTestResult(`❌ 接続エラー: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testAuth = async () => {
    setIsLoading(true);
    setTestResult('認証をテスト中...');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setTestResult(`❌ 認証エラー: ${error.message}`);
      } else {
        setTestResult(`✅ 認証システム動作中 (セッション: ${session ? 'あり' : 'なし'})`);
      }
    } catch (error: any) {
      setTestResult(`❌ 認証テストエラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDetailedConnection = async () => {
    setIsLoading(true);
    setTestResult('詳細テストを実行中...');
    
    try {
      // 1. REST APIエンドポイントテスト
      const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iYml2Z2NudnR0Z3dleWNzeml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODA2NjE2MCwiZXhwIjoyMDYzNjQyMTYwfQ.fik_aWU6_8eifZsaBpzj1fpToNJtx2J4Dq6utGkyph0';
      const response = await fetch('https://nbbivgcnvttgweycszit.supabase.co/rest/v1/', {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      });
      
      if (response.ok) {
        setTestResult('✅ 詳細テスト成功！REST APIエンドポイントに正常にアクセスできました');
      } else {
        setTestResult(`❌ REST APIエラー: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      setTestResult(`❌ 詳細テストエラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'android' ? [] : ['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Supabase接続テスト</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="データベース接続テスト"
            onPress={testSupabaseConnection}
            disabled={isLoading}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="認証システムテスト"
            onPress={testAuth}
            disabled={isLoading}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="詳細接続テスト"
            onPress={testDetailedConnection}
            disabled={isLoading}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="設定確認"
            onPress={showConfig}
            disabled={isLoading}
          />
        </View>
        
        {testResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>{testResult}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
    maxWidth: 250,
  },
  resultContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    maxWidth: '100%',
  },
  resultText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 