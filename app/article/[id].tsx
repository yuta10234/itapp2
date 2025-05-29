import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Image, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { getAnonymousId } from '@/lib/supabase';
import { Article } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticle();
    trackArticleView();
  }, [id]);

  const fetchArticle = async () => {
    try {
      console.log('Fetching article with ID:', id);
      setLoading(true);
      
      let foundArticle = null;
      
      // First, try to fetch from Supabase (now includes all articles)
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!error && data) {
          console.log('Article found in Supabase:', data.title);
          foundArticle = data;
        } else if (error && error.code !== 'PGRST116') {
          console.log('Supabase error (not "not found"):', error);
        }
      } catch (dbError) {
        console.log('Database connection error:', dbError);
      }

      // If not found in database, fallback to AsyncStorage for user-created articles
      if (!foundArticle) {
        console.log('Article not found in database, checking AsyncStorage for ID:', id);
        
        try {
          const userArticles = await AsyncStorage.getItem('userArticles');
          console.log('User articles from storage:', userArticles);
          if (userArticles) {
            const parsedArticles = JSON.parse(userArticles);
            console.log('Parsed articles:', parsedArticles);
            console.log('Available article IDs:', parsedArticles.map((a: Article) => a.id));
            foundArticle = parsedArticles.find((article: Article) => article.id === id);
            console.log('Found article in AsyncStorage:', foundArticle);
          } else {
            console.log('No user articles found in AsyncStorage');
          }
        } catch (storageError) {
          console.error('Failed to load from AsyncStorage:', storageError);
        }
      }
      
      // Set the found article or show error
      if (foundArticle) {
        console.log('Final article set:', foundArticle.title);
        setArticle(foundArticle);
      } else {
        console.log('Article not found anywhere. ID searched:', id);
        setError('記事が見つかりませんでした');
      }
      
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('記事の読み込みに失敗しました。後でもう一度お試しください。');
      setLoading(false);
    }
  };

  const trackArticleView = async () => {
    try {
      const userId = await getAnonymousId();
      console.log('Tracking article view for:', { articleId: id, userId });
      
      // Check if article was previously read
      const { data: existingProgress, error: queryError } = await supabase
        .from('article_progress')
        .select('*')
        .eq('article_id', id)
        .eq('user_id', userId)
        .single();
      
      if (queryError && queryError.code !== 'PGRST116') {
        // Error other than "not found"
        console.error('Error checking article progress:', queryError);
        return;
      }
      
      if (existingProgress) {
        // Update existing progress
        console.log('Updating existing article progress:', existingProgress);
        const { data: updatedData, error: updateError } = await supabase
          .from('article_progress')
          .update({
            read_at: new Date().toISOString(),
            read_count: existingProgress.read_count + 1
          })
          .eq('id', existingProgress.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating article progress:', updateError);
        } else {
          console.log('Article progress updated successfully:', updatedData);
        }
      } else {
        // Create new progress entry
        console.log('Creating new article progress entry for:', { articleId: id, userId });
        const { data: newData, error: insertError } = await supabase
          .from('article_progress')
          .insert({
            article_id: id,
            user_id: userId,
            read_count: 1,
            read_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating article progress:', insertError);
        } else {
          console.log('Article progress created successfully:', newData);
        }
      }
    } catch (error) {
      console.error('Error tracking article view:', error);
      // Continue even if tracking fails
    }
  };

  const handleEditArticle = () => {
    router.push({
      pathname: '/article/edit/[id]',
      params: { id }
    });
  };

  const handleDeleteArticle = () => {
    if (!article) return;
    
    console.log('Delete button pressed for article:', article.id);
    console.log('Is user created article:', isUserCreatedArticle());
    
    Alert.alert(
      '記事を削除',
      `「${article.title}」を完全に削除します。\n\nこの操作は取り消すことができません。本当に削除しますか？`,
      [
        {
          text: 'キャンセル',
          style: 'cancel'
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: confirmDeleteArticle
        }
      ]
    );
  };

  const confirmDeleteArticle = async () => {
    if (!article) return;
    
    try {
      console.log('Starting deletion process for article:', article.id);
      console.log('Article title:', article.title);
      
      let deletionSuccess = false;
      
      // Try to delete from Supabase first (article and related progress)
      try {
        console.log('Attempting database deletion...');
        
        // Delete article progress first (foreign key constraint)
        const { error: progressError } = await supabase
          .from('article_progress')
          .delete()
          .eq('article_id', id);
        
        if (progressError) {
          console.log('Progress deletion failed:', progressError);
        } else {
          console.log('Article progress deleted from database successfully');
        }
        
        // Then delete the article
        const { error } = await supabase
          .from('articles')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Database deletion failed:', error);
          Alert.alert('エラー', `データベースからの削除に失敗しました: ${error.message}`);
        } else {
          console.log('Article deleted from database successfully');
          deletionSuccess = true;
        }
      } catch (dbError) {
        console.error('Database deletion error:', dbError);
        Alert.alert('エラー', 'データベース接続エラーが発生しました。');
      }
      
      // Also try to delete from AsyncStorage
      try {
        const userArticles = await AsyncStorage.getItem('userArticles');
        if (userArticles) {
          const parsedArticles = JSON.parse(userArticles);
          const filteredArticles = parsedArticles.filter((a: Article) => a.id !== id);
          await AsyncStorage.setItem('userArticles', JSON.stringify(filteredArticles));
          console.log('Article deleted from AsyncStorage successfully');
          if (!deletionSuccess) {
            deletionSuccess = true; // Consider it successful if we deleted from storage
          }
        }
      } catch (storageError) {
        console.error('AsyncStorage deletion error:', storageError);
      }
      
      if (deletionSuccess) {
        console.log('Deletion completed successfully, navigating back...');
        Alert.alert(
          '削除完了',
          '記事が正常に削除されました。',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/articles')
            }
          ]
        );
      } else {
        Alert.alert(
          'エラー',
          '記事の削除に失敗しました。後でもう一度お試しください。',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Unexpected error during deletion:', error);
      Alert.alert(
        'エラー',
        '予期しないエラーが発生しました。後でもう一度お試しください。',
        [{ text: 'OK' }]
      );
    }
  };

  // Check if this is a user-created article (not a demo article)
  const isUserCreatedArticle = () => {
    if (!article) return false;
    const demoArticleIds = [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003'
    ];
    const isUserCreated = !demoArticleIds.includes(article.id);
    console.log('Checking if user created article:', {
      articleId: article.id,
      title: article.title,
      demoArticleIds,
      isUserCreated
    });
    return isUserCreated;
  };

  const handleLinkPress = (url: string): boolean => {
    console.log('Link pressed:', url);
    
    // Check if it's an internal link (starts with /article/)
    if (url.startsWith('/article/')) {
      const articleId = url.replace('/article/', '');
      console.log('Navigating to internal article:', articleId);
      router.push({
        pathname: '/article/[id]',
        params: { id: articleId }
      });
      return false; // Prevent default link handling
    } else {
      // External link - open in browser
      console.log('Opening external link:', url);
      Linking.openURL(url).catch(err => {
        console.error('Failed to open URL:', err);
        Alert.alert('エラー', 'リンクを開けませんでした。');
      });
      return false; // Prevent default link handling
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.gray[800]} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>記事</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
          <Text style={styles.loadingText}>記事を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.gray[800]} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>記事</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || '記事が見つかりませんでした'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const markdownStyles = {
    body: {
      color: Colors.gray[800],
      fontSize: 16,
      lineHeight: 24,
    },
    heading1: {
      ...Typography.h1,
      marginTop: 24,
      marginBottom: 16,
    },
    heading2: {
      ...Typography.h2,
      marginTop: 20,
      marginBottom: 12,
    },
    heading3: {
      ...Typography.h3,
      marginTop: 16,
      marginBottom: 8,
    },
    paragraph: {
      marginBottom: 16,
      fontSize: 16,
      lineHeight: 24,
      color: Colors.gray[800],
    },
    list_item: {
      marginBottom: 8,
      fontSize: 16,
      lineHeight: 24,
      color: Colors.gray[800],
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: Colors.primary[300],
      paddingLeft: 12,
      backgroundColor: Colors.gray[100],
      marginVertical: 12,
      paddingVertical: 8,
      borderRadius: 4,
    },
    code_block: {
      backgroundColor: Colors.gray[900],
      padding: 16,
      borderRadius: 8,
      marginVertical: 16,
      fontFamily: 'monospace',
    },
    code_inline: {
      backgroundColor: Colors.gray[200],
      color: Colors.primary[700],
      fontFamily: 'monospace',
      padding: 4,
      borderRadius: 4,
    },
    fence: {
      backgroundColor: Colors.gray[900],
      padding: 16,
      borderRadius: 8,
      marginVertical: 16,
      fontFamily: 'monospace',
    },
    link: {
      color: Colors.primary[600],
      textDecorationLine: 'underline' as 'underline',
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.gray[800]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {article.title}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {(() => {
            const canDelete = isUserCreatedArticle();
            console.log('Can delete article:', canDelete, 'for article:', article.id);
            return canDelete ? (
              <TouchableOpacity onPress={handleDeleteArticle} style={styles.deleteButton}>
                <Trash2 size={20} color={Colors.error[600]} />
              </TouchableOpacity>
            ) : null;
          })()}
          <TouchableOpacity onPress={handleEditArticle} style={styles.editButton}>
            <Edit2 size={20} color={Colors.primary[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.articleHeader}>
          <Text style={styles.articleTitle}>{article.title}</Text>
          <Text style={styles.articleDate}>
            最終更新: {new Date(article.updated_at).toLocaleDateString('ja-JP')}
          </Text>
        </View>

        {article.image_url && (
          <Image source={{ uri: article.image_url }} style={styles.heroImage} />
        )}

        <View style={styles.articleContent}>
          <Markdown 
            style={markdownStyles}
            onLinkPress={handleLinkPress}
          >
            {article.content}
          </Markdown>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  headerLeft: {
    width: 80,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 15,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 15,
  },
  headerRight: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 15,
  },
  backButton: {
    padding: 8,
    paddingTop: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    textAlign: 'center',
  },
  editButton: {
    padding: 8,
    paddingTop: 15,
  },
  deleteButton: {
    padding: 8,
    paddingTop: 15,
    marginRight: 4,
  },

  scrollContent: {
    padding: 16,
  },
  articleHeader: {
    marginBottom: 24,
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  articleDate: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  heroImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 16,
    borderRadius: 8,
  },
  articleContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.gray[600],
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