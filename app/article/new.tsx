import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save, Image as ImageIcon, X, Link2 } from 'lucide-react-native';
import { supabase, getSupabaseCredentials } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import LinkInsertModal from '@/components/LinkInsertModal';

export default function NewArticleScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Auto-save functionality - DISABLED to prevent duplicates
  // useEffect(() => {
  //   if (title.trim() && content.trim()) {
  //     if (autoSaveTimeout) {
  //       clearTimeout(autoSaveTimeout);
  //     }
  //     
  //     const timeout = setTimeout(() => {
  //       saveArticle(true);
  //     }, 5000); // Auto-save after 5 seconds of inactivity
  //     
  //     setAutoSaveTimeout(timeout);
  //   }
  //   
  //   return () => {
  //     if (autoSaveTimeout) {
  //       clearTimeout(autoSaveTimeout);
  //     }
  //   };
  // }, [title, content]);

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
    console.log('saveArticle called with isAutoSave:', isAutoSave);
    console.log('Title:', title.trim());
    console.log('Content length:', content.trim().length);
    
    if (!title.trim() || !content.trim()) {
      console.log('Title or content is empty, skipping save');
      return;
    }
    
    try {
      if (!isAutoSave) {
        setIsSaving(true);
      }
      
      const articleId = uuidv4();
      const now = new Date().toISOString();
      
      console.log('Generated article ID:', articleId);
      
      // Upload image if selected
      let imageUrl = null;
      if (selectedImage) {
        console.log('Uploading image...');
        imageUrl = await uploadImageToSupabase(selectedImage);
        if (!imageUrl && !isAutoSave) {
          // If image upload fails, still save without image
          Alert.alert(
            '画像アップロード失敗',
            '画像のアップロードに失敗しましたが、記事は画像なしで保存されます。',
            [{ text: 'OK' }]
          );
        }
      }
      
      // Create article object first
      const newArticle = {
        id: articleId,
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl,
        created_at: now,
        updated_at: now
      };
      
      console.log('Article object created:', newArticle);
      
      // Try to save to Supabase first
      let savedToDatabase = false;
      try {
        const { error } = await supabase
          .from('articles')
          .insert(newArticle);
        
        if (error) {
          console.log('Database save failed:', error);
        } else {
          console.log('Database save successful');
          savedToDatabase = true;
        }
      } catch (dbError) {
        console.log('Database error:', dbError);
      }
      
      // Only save to AsyncStorage if database save failed
      if (!savedToDatabase) {
        console.log('Starting AsyncStorage save (database save failed)...');
        try {
          const existingArticles = await AsyncStorage.getItem('userArticles');
          console.log('Existing articles in storage:', existingArticles);
          
          const articles = existingArticles ? JSON.parse(existingArticles) : [];
          console.log('Parsed existing articles:', articles);
          
          articles.push(newArticle);
          console.log('Articles array after push:', articles);
          
          await AsyncStorage.setItem('userArticles', JSON.stringify(articles));
          console.log('AsyncStorage save successful. Total articles:', articles.length);
          
          // Verify the save
          const verification = await AsyncStorage.getItem('userArticles');
          console.log('Verification - stored data:', verification);
          
        } catch (storageError) {
          console.error('AsyncStorage save failed:', storageError);
        }
      } else {
        console.log('Article saved to database, skipping AsyncStorage save');
      }
      
      setLastSaved(new Date());
      
      if (!isAutoSave) {
        console.log('Navigating back to articles list...');
        router.replace('/articles');
      }
    } catch (error) {
      console.error('Error saving article:', error);
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  };

  const handleSave = () => {
    console.log('Save button pressed');
    console.log('Current title:', title);
    console.log('Current content length:', content.length);
    saveArticle();
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
          <Text style={styles.headerTitle}>新しい記事</Text>
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
          {selectedImage ? (
            <View style={styles.selectedImageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <TouchableOpacity 
                style={styles.removeImageButton} 
                onPress={removeImage}
                disabled={isUploadingImage}
              >
                <X size={20} color={Colors.gray[600]} />
              </TouchableOpacity>
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