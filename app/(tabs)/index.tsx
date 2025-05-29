import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Typography from '@/constants/Typography';
import Colors from '@/constants/Colors';
import { ChevronRight } from 'lucide-react-native';

type ContentType = 'articles' | 'quizzes';

export default function HomeScreen() {
  const [contentType, setContentType] = useState<ContentType>('articles');

  const featuredArticles = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'React Native入門',
      description: 'React Native開発の基礎を学び、初めてのアプリを作成しましょう。',
      imageUrl: 'https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'JavaScript ES6+機能',
      description: 'コーディングをより簡単で強力にする現代のJavaScript機能を探求しましょう。',
      imageUrl: 'https://images.pexels.com/photos/4164418/pexels-photo-4164418.jpeg',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      title: 'アルゴリズム入門',
      description: 'アルゴリズムの基本概念とその応用について理解しましょう。',
      imageUrl: 'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg',
    },
  ];

  const featuredQuizzes = [
    {
      id: 'q001',
      title: 'JavaScript基礎',
      description: 'JavaScriptの基本的な知識をテストしましょう。',
      questionCount: 10,
      difficulty: '初級',
    },
    {
      id: 'q002',
      title: 'React概念',
      description: 'Reactの概念とフックに挑戦しましょう。',
      questionCount: 8,
      difficulty: '中級',
    },
    {
      id: 'q003',
      title: 'データベース理論',
      description: 'データベースの原理とSQLの理解を確認しましょう。',
      questionCount: 12,
      difficulty: '上級',
    },
  ];

  const renderArticleItem = ({ item }: { item: typeof featuredArticles[0] }) => (
    <TouchableOpacity 
      style={styles.contentCard}
      onPress={() => router.push('/articles')}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.articleImage}
        resizeMode="cover"
      />
      <View style={styles.contentCardBody}>
        <Text style={styles.contentTitle}>{item.title}</Text>
        <Text style={styles.contentDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.readMoreContainer}>
          <Text style={styles.readMoreText}>記事を読む</Text>
          <ChevronRight size={16} color={Colors.primary[600]} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderQuizItem = ({ item }: { item: typeof featuredQuizzes[0] }) => (
    <TouchableOpacity 
      style={styles.contentCard}
      onPress={() => router.push('/quizzes')}
    >
      <View style={[styles.quizBadge, 
        item.difficulty === '初級' ? styles.easyBadge : 
        item.difficulty === '中級' ? styles.mediumBadge : styles.hardBadge
      ]}>
        <Text style={styles.badgeText}>{item.difficulty}</Text>
      </View>
      <View style={styles.contentCardBody}>
        <Text style={styles.contentTitle}>{item.title}</Text>
        <Text style={styles.contentDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.quizInfoContainer}>
          <Text style={styles.quizInfoText}>{item.questionCount}問</Text>
          <View style={styles.readMoreContainer}>
            <Text style={styles.readMoreText}>クイズ開始</Text>
            <ChevronRight size={16} color={Colors.primary[600]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'android' ? [] : ['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={Typography.h1}>おかえりなさい！</Text>
          <Text style={[Typography.body, styles.subtitle]}>
            IT学習の旅を続けましょう
          </Text>
        </View>

        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabButton, contentType === 'articles' && styles.activeTabButton]}
            onPress={() => setContentType('articles')}
          >
            <Text style={[styles.tabButtonText, contentType === 'articles' && styles.activeTabButtonText]}>
              記事
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, contentType === 'quizzes' && styles.activeTabButton]}
            onPress={() => setContentType('quizzes')}
          >
            <Text style={[styles.tabButtonText, contentType === 'quizzes' && styles.activeTabButtonText]}>
              クイズ
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          {(contentType === 'articles' ? featuredArticles : featuredQuizzes).map((item) => (
            <View key={item.id}>
              {contentType === 'articles' 
                ? renderArticleItem({ item: item as typeof featuredArticles[0] })
                : renderQuizItem({ item: item as typeof featuredQuizzes[0] })}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 0,
  },
  subtitle: {
    marginTop: 6,
    color: Colors.gray[600],
  },
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: Colors.primary[500],
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  activeTabButtonText: {
    color: Colors.gray[50],
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contentCardBody: {
    padding: 16,
  },
  articleImage: {
    width: '100%',
    height: 160,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  contentDescription: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 12,
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary[600],
    marginRight: 4,
  },
  quizBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  easyBadge: {
    backgroundColor: Colors.success[100],
  },
  mediumBadge: {
    backgroundColor: Colors.warning[100],
  },
  hardBadge: {
    backgroundColor: Colors.error[100],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[800],
  },
  quizInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quizInfoText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
});