import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, PieChart } from 'react-native-chart-kit';
import Typography from '@/constants/Typography';
import Colors from '@/constants/Colors';
import { getAnonymousId, supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/LoadingScreen';

interface ProgressStats {
  totalQuizzes: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  totalArticles: number;
  articlesRead: number;
  categories: {
    [key: string]: {
      total: number;
      correct: number;
    };
  };
  recentScores: number[];
  recentArticles: {
    title: string;
    read_at: string;
    read_count: number;
  }[];
}

export default function ProgressScreen() {
  const [stats, setStats] = useState<ProgressStats>({
    totalQuizzes: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    accuracy: 0,
    totalArticles: 0,
    articlesRead: 0,
    categories: {},
    recentScores: [],
    recentArticles: [],
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width - 32;

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = await getAnonymousId();
      console.log('Fetching progress data for user:', userId);

      // Fetch quiz progress data
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_progress')
        .select('*')
        .eq('user_id', userId);

      // Fetch article progress data with article details
      const { data: articleData, error: articleError } = await supabase
        .from('article_progress')
        .select(`
          *,
          articles (
            title
          )
        `)
        .eq('user_id', userId)
        .order('read_at', { ascending: false })
        .limit(10);

      // Fetch available quizzes count
      const { data: totalQuizzesData, error: totalQuizzesError } = await supabase
        .from('quizzes')
        .select('id', { count: 'exact' });

      // Fetch available articles count
      const { data: totalArticlesData, error: totalArticlesError } = await supabase
        .from('articles')
        .select('id', { count: 'exact' });

      if (quizError && quizError.code !== 'PGRST116') {
        console.error('Quiz data error:', quizError);
      }
      if (articleError && articleError.code !== 'PGRST116') {
        console.error('Article data error:', articleError);
      }

      // Process quiz data
      const quizResults = quizData || [];
      const totalQuizzes = quizResults.length;
      const correctAnswers = quizResults.filter(q => q.is_correct).length;
      const incorrectAnswers = totalQuizzes - correctAnswers;
      const accuracy = totalQuizzes > 0 ? Math.round((correctAnswers / totalQuizzes) * 100) : 0;

      // Process category data
      const categories: { [key: string]: { total: number; correct: number } } = {};
      quizResults.forEach(quiz => {
        const category = quiz.category || 'その他';
        if (!categories[category]) {
          categories[category] = { total: 0, correct: 0 };
        }
        categories[category].total++;
        if (quiz.is_correct) {
          categories[category].correct++;
        }
      });

      // Calculate recent scores (last 6 quiz sessions)
      const recentScores: number[] = [];
      const sortedQuizzes = quizResults.sort((a, b) => 
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      );
      
      // Group by session (assuming completed_at within same day = same session)
      const sessions: { [key: string]: any[] } = {};
      sortedQuizzes.forEach(quiz => {
        const sessionKey = new Date(quiz.completed_at).toDateString();
        if (!sessions[sessionKey]) {
          sessions[sessionKey] = [];
        }
        sessions[sessionKey].push(quiz);
      });

      // Calculate accuracy for last 6 sessions
      Object.values(sessions)
        .slice(0, 6)
        .forEach(session => {
          const sessionCorrect = session.filter(q => q.is_correct).length;
          const sessionTotal = session.length;
          const sessionAccuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
          recentScores.unshift(sessionAccuracy);
        });

      // If no recent scores, add some placeholder data
      if (recentScores.length === 0) {
        recentScores.push(0);
      }

      // Process article data
      const articlesRead = articleData ? articleData.length : 0;
      const totalArticlesCount = totalArticlesData ? totalArticlesData.length : 0;
      
      // Process recent articles with fallback for articles without titles
      const recentArticles = (articleData || []).map(item => ({
        title: item.articles?.title || `記事 ${item.article_id}`,
        read_at: item.read_at,
        read_count: item.read_count
      }));

      const progressStats: ProgressStats = {
        totalQuizzes,
        correctAnswers,
        incorrectAnswers,
        accuracy,
        totalArticles: totalArticlesCount,
        articlesRead,
        categories,
        recentScores,
        recentArticles,
      };

      console.log('Progress stats calculated:', progressStats);
      setStats(progressStats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      
      // Fallback to demo data if database is not available
      console.log('Using demo data as fallback');
      const demoStats: ProgressStats = {
        totalQuizzes: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracy: 0,
        totalArticles: 3, // Demo articles
        articlesRead: 0,
        categories: {},
        recentScores: [0],
        recentArticles: [],
      };
      
      setStats(demoStats);
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="進捗を読み込み中..." />;
  }

  const pieChartData = [
    {
      name: '正解',
      population: stats.correctAnswers,
      color: Colors.success[500],
      legendFontColor: Colors.gray[700],
      legendFontSize: 12,
    },
    {
      name: '不正解',
      population: stats.incorrectAnswers,
      color: Colors.error[400],
      legendFontColor: Colors.gray[700],
      legendFontSize: 12,
    },
  ];

  const lineChartData = {
    labels: ['クイズ1', 'クイズ2', 'クイズ3', 'クイズ4', 'クイズ5', 'クイズ6'],
    datasets: [
      {
        data: stats.recentScores,
        color: () => Colors.primary[500],
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: () => Colors.primary[500],
    labelColor: () => Colors.gray[700],
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: Colors.primary[700],
    },
  };

  // Function to render category performance
  const renderCategories = () => {
    return Object.entries(stats.categories).map(([category, data]) => {
      const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      return (
        <View key={category} style={styles.categoryItem}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryName}>{category}</Text>
            <Text style={styles.categoryAccuracy}>正答率 {accuracy}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${accuracy}%` }]} />
          </View>
          <Text style={styles.categoryStats}>
            {data.total}問中{data.correct}問正解
          </Text>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'android' ? [] : ['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={Typography.h1}>学習進捗</Text>
          <Text style={Typography.body}>あなたの成果と学習の旅を追跡しましょう</Text>
        </View>

        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'overview' && styles.activeTabButton]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.activeTabButtonText]}>
              概要
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'quizzes' && styles.activeTabButton]}
            onPress={() => setActiveTab('quizzes')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'quizzes' && styles.activeTabButtonText]}>
              クイズ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'articles' && styles.activeTabButton]}
            onPress={() => setActiveTab('articles')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'articles' && styles.activeTabButtonText]}>
              記事
            </Text>
          </TouchableOpacity>
        </View>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : activeTab === 'overview' ? (
          <View style={styles.contentContainer}>
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>クイズ成績</Text>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalQuizzes}</Text>
                  <Text style={styles.statLabel}>受験回数</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.accuracy}%</Text>
                  <Text style={styles.statLabel}>正答率</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.articlesRead}</Text>
                  <Text style={styles.statLabel}>読了記事数</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Object.keys(stats.categories).length}</Text>
                  <Text style={styles.statLabel}>学習分野</Text>
                </View>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>回答分布</Text>
              <PieChart
                data={pieChartData}
                width={screenWidth}
                height={180}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute
              />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>最近のクイズスコア</Text>
              <LineChart
                data={lineChartData}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.lineChart}
              />
            </View>
          </View>
        ) : activeTab === 'quizzes' ? (
          <View style={styles.contentContainer}>
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>カテゴリ別クイズ成績</Text>
              {renderCategories()}
            </View>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>読書活動</Text>
              <View style={styles.articleStats}>
                <View style={styles.articleStatItem}>
                  <Text style={styles.articleStatValue}>{stats.articlesRead}</Text>
                  <Text style={styles.articleStatLabel}>読了記事数</Text>
                </View>
                <View style={styles.articleStatItem}>
                  <Text style={styles.articleStatValue}>
                    {Math.round((stats.articlesRead / stats.totalArticles) * 100)}%
                  </Text>
                  <Text style={styles.articleStatLabel}>読了率</Text>
                </View>
              </View>

              <Text style={styles.readingListTitle}>最近の記事</Text>
              <View style={styles.readingList}>
                {stats.recentArticles.length > 0 ? (
                  stats.recentArticles.map((article, index) => (
                    <View key={index} style={styles.recentArticleItem}>
                      <View style={styles.articleItemContent}>
                        <Text style={styles.articleItemTitle} numberOfLines={2}>
                          {article.title}
                        </Text>
                        <Text style={styles.articleItemDate}>
                          {new Date(article.read_at).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <View style={styles.readCountBadge}>
                        <Text style={styles.readCountText}>{article.read_count}回</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyStateText}>
                    読書履歴はまだありません。記事を読み始めてみましょう！
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
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
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  activeTabButtonText: {
    color: Colors.gray[50],
  },
  scrollContent: {
    paddingBottom: 32,
  },
  contentContainer: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsHeader: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statItem: {
    width: '50%',
    padding: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary[600],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  lineChart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 16,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[800],
  },
  categoryAccuracy: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.gray[200],
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.primary[500],
    borderRadius: 4,
  },
  categoryStats: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  articleStats: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  articleStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  articleStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary[600],
    marginBottom: 4,
  },
  articleStatLabel: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  readingListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 12,
  },
  readingList: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  recentArticleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  articleItemContent: {
    flex: 1,
    marginRight: 12,
  },
  articleItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[800],
    marginBottom: 4,
  },
  articleItemDate: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  readCountBadge: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readCountText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.primary[700],
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error[600],
    textAlign: 'center',
  },
});