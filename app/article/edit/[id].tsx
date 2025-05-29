import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Save, Image as ImageIcon, X, Link2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getSupabaseCredentials } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { Article } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { v4 as uuidv4 } from 'uuid';
import LinkInsertModal from '@/components/LinkInsertModal';

export default function EditArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  // Auto-save functionality
  useEffect(() => {
    if (article && title.trim() && content.trim()) {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      
      const timeout = setTimeout(() => {
        saveArticle(true);
      }, 5000); // Auto-save after 5 seconds of inactivity
      
      setAutoSaveTimeout(timeout);
    }
    
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [title, content]);

  const fetchArticle = async () => {
    try {
      console.log('Fetching article for edit with ID:', id);
      setLoading(true);
      
      let foundArticle = null;
      
      // First, try to fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!error && data) {
          console.log('Article found in Supabase for edit:', data.title);
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
        console.log('Final article set for editing:', foundArticle.title);
        setArticle(foundArticle);
        setTitle(foundArticle.title);
        setContent(foundArticle.content);
        setCurrentImageUrl(foundArticle.image_url || null);
      } else {
        console.log('Article not found anywhere for editing. ID searched:', id);
        setError('記事が見つかりませんでした');
      }
      
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('Failed to load article. Please try again later.');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          '権限が必要です',
          'アイキャッチ画像を選択するには、写真ライブラリへのアクセス権限が必要です。',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Aspect ratio for hero images
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('エラー', '画像の選択に失敗しました。');
    }
  };

  const uploadImageToSupabase = async (imageUri: string): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      console.log('Starting image upload from:', imageUri);
      
      // Generate unique filename
      const filename = `${uuidv4()}.jpg`;
      console.log('Generated filename:', filename);
      
      // 画像をJPEG形式に変換（Base64なし）
      console.log('Converting image to JPEG...');
      const manipulatorResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1200 } }], // 最大幅1200pxにリサイズ
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      console.log('Image converted, new URI:', manipulatorResult.uri);

      // ファイルをArrayBufferとして読み取り
      console.log('Reading file as ArrayBuffer...');
      const response = await fetch(manipulatorResult.uri);
      if (!response.ok) {
        throw new Error(`Failed to read image: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);

      // ArrayBufferをUint8Arrayに変換
      const uint8Array = new Uint8Array(arrayBuffer);

      // Supabase Storageに直接アップロード
      console.log('Uploading to Supabase storage...');
      const { data, error } = await supabase.storage
        .from('article-images')
        .upload(filename, uint8Array, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`アップロードエラー: ${error.message}`);
      }

      console.log('Upload successful, data:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('article-images')
        .getPublicUrl(filename);

      console.log('Public URL generated:', urlData.publicUrl);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : '画像のアップロードに失敗しました。';
      Alert.alert('アップロードエラー', errorMessage);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setCurrentImageUrl(null);
  };

  const handleInsertLink = (linkText: string, linkUrl: string) => {
    const markdownLink = `[${linkText}](${linkUrl})`;
    const newContent = content.slice(0, cursorPosition) + markdownLink + content.slice(cursorPosition);
    setContent(newContent);
    
    // Move cursor to after the inserted link
    setTimeout(() => {
      setCursorPosition(cursorPosition + markdownLink.length);
    }, 100);
  };

  const handleContentChange = (text: string) => {
    setContent(text);
  };

  const handleContentSelectionChange = (event: any) => {
    setCursorPosition(event.nativeEvent.selection.start);
  };

  const saveArticle = async (isAutoSave = false) => {
    if (!article || !title.trim() || !content.trim()) {
      return;
    }
    
    try {
      if (!isAutoSave) {
        setIsSaving(true);
      }
      
      const now = new Date().toISOString();
      console.log('Updating article:', article.id);
      
      // Upload new image if selected
      let imageUrl = currentImageUrl; // Keep existing image URL by default
      if (selectedImage) {
        console.log('Uploading new image...');
        const uploadedUrl = await uploadImageToSupabase(selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          // Update state immediately after successful upload
          setCurrentImageUrl(uploadedUrl);
          setSelectedImage(null); // Clear selected image since it's now uploaded
          console.log('Image upload successful, updated state');
        } else if (!isAutoSave) {
          // If image upload fails, still save without updating image
          Alert.alert(
            '画像アップロード失敗',
            '画像のアップロードに失敗しましたが、記事は既存の画像で保存されます。',
            [{ text: 'OK' }]
          );
        }
      }
      
      // Try to update in Supabase first
      let savedToDatabase = false;
      try {
        const { error } = await supabase
          .from('articles')
          .update({
            title: title.trim(),
            content: content.trim(),
            image_url: imageUrl,
            updated_at: now
          })
          .eq('id', article.id);
        
        if (!error) {
          console.log('Database update successful');
          savedToDatabase = true;
          // Update local article object with latest data
          setArticle(prev => prev ? {
            ...prev,
            title: title.trim(),
            content: content.trim(),
            image_url: imageUrl || undefined,
            updated_at: now
          } : null);
        } else {
          console.log('Database update failed:', error);
        }
      } catch (dbError) {
        console.log('Database update error:', dbError);
      }
      
      // If database update failed, try to update in AsyncStorage
      if (!savedToDatabase) {
        try {
          const userArticles = await AsyncStorage.getItem('userArticles');
          if (userArticles) {
            const parsedArticles = JSON.parse(userArticles);
            const updatedArticles = parsedArticles.map((a: Article) => 
              a.id === article.id 
                ? { ...a, title: title.trim(), content: content.trim(), image_url: imageUrl, updated_at: now }
                : a
            );
            await AsyncStorage.setItem('userArticles', JSON.stringify(updatedArticles));
            console.log('AsyncStorage update successful');
            // Update local article object with latest data
            setArticle(prev => prev ? {
              ...prev,
              title: title.trim(),
              content: content.trim(),
              image_url: imageUrl || undefined,
              updated_at: now
            } : null);
          }
        } catch (storageError) {
          console.error('AsyncStorage update failed:', storageError);
        }
      }
      
      setLastSaved(new Date());
      
      if (!isAutoSave) {
        // Show success message if image was uploaded
        if (selectedImage && imageUrl) {
          Alert.alert(
            '保存完了',
            '記事と画像の保存が完了しました。',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/articles')
              }
            ]
          );
        } else {
          router.replace('/articles');
        }
      }
    } catch (error) {
      console.error('Error updating article:', error);
      // Continue even if saving fails
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  };

  const handleSave = () => {
    saveArticle();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.gray[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>記事を編集</Text>
          <View style={styles.placeholderButton} />
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.gray[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>記事を編集</Text>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || '記事が見つかりませんでした'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.gray[800]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>記事を編集</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, (!title.trim() || !content.trim() || isSaving) && styles.disabledButton]}
            disabled={!title.trim() || !content.trim() || isSaving}
          >
            <Save size={20} color={(!title.trim() || !content.trim() || isSaving) ? Colors.gray[400] : Colors.primary[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.editorContainer}>
        <TextInput
          style={styles.titleInput}
          placeholder="記事のタイトル"
          value={title}
          onChangeText={setTitle}
          multiline={false}
          maxLength={100}
          placeholderTextColor={Colors.gray[400]}
        />

        {/* Image Selection Section */}
        <View style={styles.imageSection}>
          <Text style={styles.imageSectionTitle}>アイキャッチ画像</Text>
          {selectedImage || currentImageUrl ? (
            <View style={styles.selectedImageContainer}>
              <Image 
                source={{ uri: selectedImage || currentImageUrl! }} 
                style={styles.selectedImage} 
              />
              <TouchableOpacity 
                style={styles.removeImageButton} 
                onPress={removeImage}
                disabled={isUploadingImage}
              >
                <X size={20} color={Colors.gray[600]} />
              </TouchableOpacity>
              {currentImageUrl && !selectedImage && (
                <TouchableOpacity 
                  style={styles.changeImageButton}
                  onPress={pickImage}
                  disabled={isUploadingImage}
                >
                  <ImageIcon size={16} color={Colors.gray[600]} />
                  <Text style={styles.changeImageText}>変更</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={pickImage}
              disabled={isUploadingImage}
            >
              <ImageIcon size={24} color={Colors.gray[500]} />
              <Text style={styles.imagePickerText}>
                {isUploadingImage ? 'アップロード中...' : '画像を選択'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Link Insert Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setShowLinkModal(true)}
          >
            <Link2 size={20} color={Colors.gray[600]} />
            <Text style={styles.toolbarButtonText}>リンク</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.contentInput}
          placeholder="記事の内容をMarkdown形式で書いてください..."
          value={content}
          onChangeText={handleContentChange}
          onSelectionChange={handleContentSelectionChange}
          multiline={true}
          placeholderTextColor={Colors.gray[400]}
          textAlignVertical="top"
        />
      </ScrollView>

      {lastSaved && (
        <View style={styles.autoSaveIndicator}>
          <Text style={styles.autoSaveText}>
            最終保存: {lastSaved.toLocaleTimeString()}
          </Text>
        </View>
      )}

      <View style={styles.markdownHelp}>
        <Text style={styles.markdownHelpTitle}>Markdownのヒント:</Text>
        <Text style={styles.markdownHelpText}>
          # Heading 1{'\n'}
          ## Heading 2{'\n'}
          **Bold text**{'\n'}
          *Italic text*{'\n'}
          - List item{'\n'}
          ```code block```{'\n'}
          [Link](url)
        </Text>
      </View>

      {/* Link Insert Modal */}
      <LinkInsertModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onInsertLink={handleInsertLink}
      />
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
    paddingTop: 10,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  headerRight: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    textAlign: 'center',
  },
  saveButton: {
    padding: 8,
    paddingTop: 10,
  },
  placeholderButton: {
    width: 36,
    height: 36,
  },
  disabledButton: {
    opacity: 0.5,
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.gray[800],
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.gray[800],
    padding: 16,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    minHeight: 300,
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
  autoSaveIndicator: {
    padding: 8,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
  },
  autoSaveText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  markdownHelp: {
    padding: 16,
    backgroundColor: Colors.gray[100],
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  markdownHelpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  markdownHelpText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.gray[700],
    fontFamily: 'monospace',
  },
  imageSection: {
    marginBottom: 16,
  },
  imageSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 12,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 16,
    color: Colors.gray[500],
    marginLeft: 8,
  },
  selectedImageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeImageText: {
    fontSize: 12,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.gray[50],
  },
  toolbarButtonText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginLeft: 6,
  },
});