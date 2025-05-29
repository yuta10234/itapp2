import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { X, ExternalLink, FileText, Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { Article } from '@/types';

interface LinkInsertModalProps {
  visible: boolean;
  onClose: () => void;
  onInsertLink: (linkText: string, linkUrl: string) => void;
}

export default function LinkInsertModal({ visible, onClose, onInsertLink }: LinkInsertModalProps) {
  const [linkType, setLinkType] = useState<'internal' | 'external'>('internal');
  const [linkText, setLinkText] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && linkType === 'internal') {
      fetchArticles();
    }
  }, [visible, linkType]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      console.log('Fetching articles for link selection...');
      
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching articles:', error);
        Alert.alert('エラー', '記事一覧の取得に失敗しました。');
        return;
      }
      
      setArticles(data || []);
      console.log('Fetched articles:', data?.length);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInsertLink = () => {
    if (!linkText.trim()) {
      Alert.alert('エラー', 'リンクテキストを入力してください。');
      return;
    }

    let url = '';
    if (linkType === 'internal') {
      if (!selectedArticle) {
        Alert.alert('エラー', 'リンク先の記事を選択してください。');
        return;
      }
      url = `/article/${selectedArticle.id}`;
    } else {
      if (!externalUrl.trim()) {
        Alert.alert('エラー', 'URLを入力してください。');
        return;
      }
      
      // Add protocol if missing
      let formattedUrl = externalUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      url = formattedUrl;
    }

    onInsertLink(linkText, url);
    handleClose();
  };

  const handleClose = () => {
    setLinkText('');
    setExternalUrl('');
    setSelectedArticle(null);
    setSearchQuery('');
    setLinkType('internal');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>リンクを挿入</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={Colors.gray[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Link Type Selection */}
          <View style={styles.typeSelection}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                linkType === 'internal' && styles.typeButtonActive
              ]}
              onPress={() => setLinkType('internal')}
            >
              <FileText size={20} color={linkType === 'internal' ? Colors.primary[600] : Colors.gray[500]} />
              <Text style={[
                styles.typeButtonText,
                linkType === 'internal' && styles.typeButtonTextActive
              ]}>
                内部リンク
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                linkType === 'external' && styles.typeButtonActive
              ]}
              onPress={() => setLinkType('external')}
            >
              <ExternalLink size={20} color={linkType === 'external' ? Colors.primary[600] : Colors.gray[500]} />
              <Text style={[
                styles.typeButtonText,
                linkType === 'external' && styles.typeButtonTextActive
              ]}>
                外部リンク
              </Text>
            </TouchableOpacity>
          </View>

          {/* Link Text Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>リンクテキスト *</Text>
            <TextInput
              style={styles.textInput}
              value={linkText}
              onChangeText={setLinkText}
              placeholder="表示するテキストを入力"
              placeholderTextColor={Colors.gray[400]}
            />
          </View>

          {/* Internal Link Selection */}
          {linkType === 'internal' && (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>リンク先記事 *</Text>
              
              {/* Search Input */}
              <View style={styles.searchContainer}>
                <Search size={16} color={Colors.gray[400]} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="記事を検索..."
                  placeholderTextColor={Colors.gray[400]}
                />
              </View>

              {/* Articles List */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary[600]} />
                  <Text style={styles.loadingText}>記事を読み込み中...</Text>
                </View>
              ) : (
                <ScrollView style={styles.articlesList} nestedScrollEnabled>
                  {filteredArticles.map((article) => (
                    <TouchableOpacity
                      key={article.id}
                      style={[
                        styles.articleItem,
                        selectedArticle?.id === article.id && styles.articleItemSelected
                      ]}
                      onPress={() => setSelectedArticle(article)}
                    >
                      <Text style={[
                        styles.articleTitle,
                        selectedArticle?.id === article.id && styles.articleTitleSelected
                      ]}>
                        {article.title}
                      </Text>
                      <Text style={styles.articleDate}>
                        {new Date(article.created_at).toLocaleDateString('ja-JP')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {filteredArticles.length === 0 && !loading && (
                    <Text style={styles.noArticlesText}>
                      {searchQuery ? '検索結果がありません' : '記事がありません'}
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>
          )}

          {/* External Link Input */}
          {linkType === 'external' && (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>URL *</Text>
              <TextInput
                style={styles.textInput}
                value={externalUrl}
                onChangeText={setExternalUrl}
                placeholder="https://example.com"
                placeholderTextColor={Colors.gray[400]}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </ScrollView>

        {/* Insert Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.insertButton,
              (!linkText.trim() || 
               (linkType === 'internal' && !selectedArticle) ||
               (linkType === 'external' && !externalUrl.trim())
              ) && styles.insertButtonDisabled
            ]}
            onPress={handleInsertLink}
            disabled={
              !linkText.trim() || 
              (linkType === 'internal' && !selectedArticle) ||
              (linkType === 'external' && !externalUrl.trim())
            }
          >
            <Text style={[
              styles.insertButtonText,
              (!linkText.trim() || 
               (linkType === 'internal' && !selectedArticle) ||
               (linkType === 'external' && !externalUrl.trim())
              ) && styles.insertButtonTextDisabled
            ]}>
              リンクを挿入
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  typeSelection: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  typeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[500],
    marginLeft: 8,
  },
  typeButtonTextActive: {
    color: Colors.primary[600],
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: Colors.gray[800],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.gray[800],
    marginLeft: 8,
  },
  articlesList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  articleItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  articleItemSelected: {
    backgroundColor: Colors.primary[50],
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[800],
    marginBottom: 4,
  },
  articleTitleSelected: {
    color: Colors.primary[700],
  },
  articleDate: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  noArticlesText: {
    textAlign: 'center',
    padding: 20,
    color: Colors.gray[500],
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: Colors.gray[600],
    fontSize: 14,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  insertButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  insertButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  insertButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  insertButtonTextDisabled: {
    color: Colors.gray[500],
  },
}); 