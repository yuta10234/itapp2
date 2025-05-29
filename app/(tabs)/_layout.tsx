import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Lightbulb, Book, BarChart3, Database } from 'lucide-react-native';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary[600],
        tabBarInactiveTintColor: Colors.gray[500],
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: Colors.gray[200],
          height: Platform.OS === 'ios' ? 88 : 64 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 28 : Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-Medium',
        },
        headerStyle: {
          backgroundColor: Colors.primary[500],
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontFamily: 'Inter-SemiBold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          headerTitle: 'IT学習アプリ',
        }}
      />
      <Tabs.Screen
        name="quizzes"
        options={{
          title: 'クイズ',
          tabBarIcon: ({ color, size }) => <Lightbulb size={size} color={color} />,
          headerTitle: 'クイズ練習',
        }}
      />
      <Tabs.Screen
        name="articles"
        options={{
          title: '記事',
          tabBarIcon: ({ color, size }) => <Book size={size} color={color} />,
          headerTitle: '学習記事',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: '進捗',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          headerTitle: '学習進捗',
        }}
      />
      <Tabs.Screen
        name="supabase-test"
        options={{
          title: 'テスト',
          tabBarIcon: ({ color, size }) => <Database size={size} color={color} />,
          headerTitle: 'Supabase接続テスト',
        }}
      />
    </Tabs>
  );
}