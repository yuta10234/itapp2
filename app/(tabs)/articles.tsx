import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Platform, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { PlusCircle, Search, ChevronRight } from 'lucide-react-native';
import Typography from '@/constants/Typography';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/LoadingScreen';
import { Article } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ArticlesScreen() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  // Refresh when screen comes into focus (e.g., after creating a new article)
  useFocusEffect(
    React.useCallback(() => {
      console.log('Articles tab focused - refreshing data');
      // Add a small delay to ensure proper state management
      const timer = setTimeout(() => {
        fetchArticles();
      }, 100);
      
      return () => clearTimeout(timer);
    }, [])
  );

  // Pull to refresh handler
  const onRefresh = React.useCallback(async () => {
    console.log('Pull to refresh triggered');
    setRefreshing(true);
    await fetchArticles();
    setRefreshing(false);
  }, []);

  const fetchArticles = async () => {
    try {
      // Only show loading spinner if not refreshing
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);
      
      // Clean up AsyncStorage duplicates first
      await cleanupAsyncStorage();
      
      // Start with empty array to collect all articles
      let allArticles = [];
      
      // First, try to get articles from Supabase
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // If it's a table not found error, just log it and continue
          if (error.code === 'PGRST116' || error.message.includes('relation "articles" does not exist')) {
            console.log('Articles table not found, using demo data only');
          } else {
            throw error;
          }
        } else {
          allArticles = data || [];
        }
      } catch (dbError) {
        console.log('Database error, continuing with local articles:', dbError);
      }
      
      // Then, load user-created articles from AsyncStorage
      try {
        const userArticles = await AsyncStorage.getItem('userArticles');
        console.log('Loading user articles from AsyncStorage:', userArticles);
        if (userArticles) {
          const parsedUserArticles = JSON.parse(userArticles);
          console.log('Parsed user articles:', parsedUserArticles.length, 'articles');
          // Add user articles to the beginning so they appear first
          allArticles = [...parsedUserArticles, ...allArticles];
        }
      } catch (storageError) {
        console.log('Failed to load user articles from AsyncStorage:', storageError);
      }
      
      // Remove duplicates by ID (keep the first occurrence)
      const uniqueArticles = allArticles.filter((article, index, self) => 
        index === self.findIndex(a => a.id === article.id)
      );
      
      // Sort all articles by updated_at/created_at in descending order (newest first)
      const sortedArticles = uniqueArticles.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB.getTime() - dateA.getTime(); // Descending order
      });
      
      console.log('Articles before deduplication:', allArticles.length);
      console.log('Articles after deduplication:', uniqueArticles.length);
      console.log('Articles after sorting by date:', sortedArticles.length);
      
      // Log article sources for debugging
      sortedArticles.forEach(article => {
        console.log(`Article: ${article.title} - ID: ${article.id}`);
      });
      
      setArticles(sortedArticles);
    } catch (error) {
      console.error('Error fetching articles:', error);
      setError('記事の読み込みに失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateArticle = () => {
    router.push('/article/new');
  };

  // Clean up AsyncStorage duplicates
  const cleanupAsyncStorage = async () => {
    try {
      const userArticles = await AsyncStorage.getItem('userArticles');
      if (userArticles) {
        const parsedArticles = JSON.parse(userArticles);
        console.log('Found AsyncStorage articles to cleanup:', parsedArticles.length);
        
        // Check which articles exist in Supabase
        const articleIds = parsedArticles.map((article: Article) => article.id);
        const { data: dbArticles, error } = await supabase
          .from('articles')
          .select('id')
          .in('id', articleIds);
        
        if (!error && dbArticles) {
          const dbArticleIds = dbArticles.map(article => article.id);
          // Keep only articles that are NOT in database
          const uniqueLocalArticles = parsedArticles.filter(
            (article: Article) => !dbArticleIds.includes(article.id)
          );
          
          console.log('Articles in DB that should be removed from AsyncStorage:', dbArticleIds.length);
          console.log('Articles to keep in AsyncStorage:', uniqueLocalArticles.length);
          
          await AsyncStorage.setItem('userArticles', JSON.stringify(uniqueLocalArticles));
          console.log('AsyncStorage cleanup completed');
        }
      }
    } catch (error) {
      console.log('AsyncStorage cleanup failed:', error);
    }
  };



  const displayArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingScreen message="記事を読み込み中..." />;
  }

  const renderArticleItem = ({ item }: { item: Article }) => {
    // Format date in Japanese
    const formattedDate = new Date(item.updated_at).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Extract first paragraph for preview
    const previewText = item.content.split('\n')[0].replace(/[#*_]/g, '').trim();

    return (
      <TouchableOpacity
        style={styles.articleCard}
        onPress={() => router.push({
          pathname: '/article/[id]',
          params: { id: item.id }
        })}
      >
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.articleImage} />
        )}
        <View style={styles.articleCardContent}>
          <Text style={styles.articleTitle}>{item.title}</Text>
          <Text style={styles.articlePreview} numberOfLines={2}>
            {previewText}
          </Text>
          <View style={styles.articleCardFooter}>
            <Text style={styles.dateText}>更新日: {formattedDate}</Text>
            <View style={styles.readMoreButton}>
              <Text style={styles.readMoreText}>読む</Text>
              <ChevronRight size={16} color={Colors.primary[600]} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'android' ? [] : ['bottom']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary[600]]} // Android
            tintColor={Colors.primary[600]} // iOS
          />
        }
      >
        <View style={styles.header}>
          <Text style={Typography.h1}>学習記事</Text>
          <Text style={Typography.body}>詳細な記事で知識を広げましょう</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.gray[500]} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="記事を検索..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateArticle}
          >
            <PlusCircle size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.articlesList}>
            {displayArticles.map((item) => (
              <View key={item.id}>
                {renderArticleItem({ item })}
              </View>
            ))}
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: Colors.gray[800],
  },
  createButton: {
    marginLeft: 12,
    backgroundColor: Colors.primary[600],
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  articlesList: {
    padding: 16,
  },
  articleCard: {
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
  articleImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  articleCardContent: {
    padding: 16,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  articlePreview: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 12,
    lineHeight: 20,
  },
  articleCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary[600],
    marginRight: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error[600],
    textAlign: 'center',
  },
});