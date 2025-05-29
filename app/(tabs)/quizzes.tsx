import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Filter } from 'lucide-react-native';
import Typography from '@/constants/Typography';
import Colors from '@/constants/Colors';
import quizData from '@/data/quizData.json';
import { QuizQuestion } from '@/types';

export default function QuizzesScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  useEffect(() => {
    // Load quiz data
    setQuizzes(quizData);
  }, []);

  // Get unique categories from quiz data
  const categories = ['すべて', ...new Set(quizData.map(quiz => quiz.category))];

  // Filter quizzes by category
  const filteredQuizzes = selectedCategory && selectedCategory !== 'すべて'
    ? quizzes.filter(quiz => quiz.category === selectedCategory)
    : quizzes;

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item && styles.selectedCategoryChip
      ]}
      onPress={() => setSelectedCategory(item === 'すべて' ? null : item)}
    >
      <Text
        style={[
          styles.categoryChipText,
          selectedCategory === item && styles.selectedCategoryChipText
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderQuizItem = ({ item }: { item: QuizQuestion }) => (
    <TouchableOpacity
      style={styles.quizCard}
      onPress={() => router.push({
        pathname: '/quiz/[id]',
        params: { id: item.id }
      })}
    >
      <View style={styles.quizCardContent}>
        <View style={styles.quizCardHeader}>
          <View style={[
            styles.difficultyBadge, 
            item.difficulty === 'easy' ? styles.easyBadge : 
            item.difficulty === 'medium' ? styles.mediumBadge : styles.hardBadge
          ]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
          <Text style={styles.quizType}>{item.type === 'multiple-choice' ? 'Multiple Choice' : 'Fill in the Blank'}</Text>
        </View>
        <Text style={styles.quizQuestion} numberOfLines={2}>{item.question}</Text>
        <View style={styles.quizCardFooter}>
          <Text style={styles.categoryText}>{item.category}</Text>
          <View style={styles.startQuizButton}>
            <Text style={styles.startQuizText}>Start</Text>
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
          <Text style={Typography.h1}>クイズ練習</Text>
          <Text style={Typography.body}>インタラクティブなクイズでIT知識をテストしましょう</Text>
        </View>

        <View style={styles.categoriesContainer}>
          <View style={styles.filterHeader}>
            <Filter size={20} color={Colors.gray[700]} />
            <Text style={styles.filterText}>カテゴリでフィルター</Text>
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        <View style={styles.quizList}>
          {filteredQuizzes.map((item) => (
            <View key={item.id}>
              {renderQuizItem({ item })}
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
  categoriesContainer: {
    marginTop: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
    marginLeft: 8,
  },
  categoriesList: {
    paddingHorizontal: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.gray[200],
    marginHorizontal: 4,
    marginBottom: 16,
  },
  selectedCategoryChip: {
    backgroundColor: Colors.primary[500],
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  selectedCategoryChipText: {
    color: Colors.gray[50],
  },
  quizList: {
    padding: 16,
  },
  quizCard: {
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
  quizCardContent: {
    padding: 16,
  },
  quizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[800],
  },
  quizType: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  quizQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 16,
  },
  quizCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  startQuizButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startQuizText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary[600],
    marginRight: 4,
  },
});