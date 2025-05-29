import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, X, ArrowLeft, ChevronRight, HelpCircle } from 'lucide-react-native';
import Typography from '@/constants/Typography';
import Colors from '@/constants/Colors';
import quizData from '@/data/quizData.json';
import { QuizQuestion } from '@/types';
import { getAnonymousId, supabase } from '@/lib/supabase';

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeTaken, setTimeTaken] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  
  useEffect(() => {
    // Find the question with the matching ID
    const foundQuestion = quizData.find(q => q.id === id);
    if (foundQuestion) {
      setQuestion(foundQuestion);
      setStartTime(Date.now());
    }
  }, [id]);

  const handleOptionSelect = (option: string) => {
    if (!isAnswerSubmitted) {
      setSelectedOption(option);
    }
  };

  const handleFillInBlankChange = (text: string) => {
    if (!isAnswerSubmitted) {
      setAnswer(text);
    }
  };

  const checkMultipleChoiceAnswer = () => {
    if (!question || !selectedOption) return false;
    
    const isAnswerCorrect = selectedOption === question.correctAnswer;
    setIsCorrect(isAnswerCorrect);
    return isAnswerCorrect;
  };

  const checkFillInBlankAnswer = () => {
    if (!question || !answer) return false;
    
    const correctAnswers = Array.isArray(question.correctAnswer) 
      ? question.correctAnswer 
      : [question.correctAnswer];
    
    const isAnswerCorrect = correctAnswers.some(
      correctAns => answer.toLowerCase().trim() === correctAns.toLowerCase().trim()
    );
    
    setIsCorrect(isAnswerCorrect);
    return isAnswerCorrect;
  };

  const handleSubmitAnswer = async () => {
    if (isAnswerSubmitted) return;
    
    const endTime = Date.now();
    const timeElapsed = Math.floor((endTime - startTime) / 1000); // in seconds
    setTimeTaken(timeElapsed);
    
    let correct = false;
    
    if (question?.type === 'multiple-choice') {
      if (!selectedOption) return;
      correct = checkMultipleChoiceAnswer();
    } else if (question?.type === 'fill-in-blank') {
      if (!answer) return;
      correct = checkFillInBlankAnswer();
    }
    
    setIsAnswerSubmitted(true);
    
    try {
      // Save progress to Supabase
      const userId = await getAnonymousId();
      
      await supabase.from('quiz_progress').insert({
        question_id: question?.id || '',
        is_correct: correct,
        time_taken: timeElapsed,
        user_id: userId
      });
    } catch (error) {
      console.error('Error saving quiz progress:', error);
      // Continue even if saving fails
    }
  };

  const handleNextQuestion = () => {
    // In a real app, you would navigate to the next question
    // For now, we'll just go back to the quizzes list
    router.back();
  };

  if (!question) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.gray[800]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Quiz Question</Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.errorText}>Question not found</Text>
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
          <Text style={styles.headerTitle}>
            {question.category} - {question.difficulty}
          </Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{question.question}</Text>

          {question.type === 'multiple-choice' ? (
            <View style={styles.optionsContainer}>
              {question.options?.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    selectedOption === option && styles.selectedOption,
                    isAnswerSubmitted && selectedOption === option && isCorrect && styles.correctOption,
                    isAnswerSubmitted && selectedOption === option && !isCorrect && styles.incorrectOption,
                    isAnswerSubmitted && option === question.correctAnswer && !isCorrect && styles.correctOption,
                  ]}
                  onPress={() => handleOptionSelect(option)}
                  disabled={isAnswerSubmitted}
                >
                  <Text style={[
                    styles.optionText,
                    selectedOption === option && styles.selectedOptionText,
                    isAnswerSubmitted && selectedOption === option && isCorrect && styles.correctOptionText,
                    isAnswerSubmitted && selectedOption === option && !isCorrect && styles.incorrectOptionText,
                    isAnswerSubmitted && option === question.correctAnswer && !isCorrect && styles.correctOptionText,
                  ]}>
                    {option}
                  </Text>
                  {isAnswerSubmitted && selectedOption === option && isCorrect && (
                    <Check size={20} color={Colors.success[600]} />
                  )}
                  {isAnswerSubmitted && selectedOption === option && !isCorrect && (
                    <X size={20} color={Colors.error[600]} />
                  )}
                  {isAnswerSubmitted && option === question.correctAnswer && selectedOption !== option && (
                    <Check size={20} color={Colors.success[600]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.fillInBlankContainer}>
              <TextInput
                style={[
                  styles.fillInBlankInput,
                  isAnswerSubmitted && isCorrect && styles.correctInput,
                  isAnswerSubmitted && !isCorrect && styles.incorrectInput,
                ]}
                value={answer}
                onChangeText={handleFillInBlankChange}
                placeholder="Type your answer..."
                placeholderTextColor={Colors.gray[400]}
                editable={!isAnswerSubmitted}
                autoCapitalize="none"
              />
              {isAnswerSubmitted && (
                <View style={styles.resultIconContainer}>
                  {isCorrect ? (
                    <Check size={24} color={Colors.success[600]} />
                  ) : (
                    <X size={24} color={Colors.error[600]} />
                  )}
                </View>
              )}
            </View>
          )}

          {isAnswerSubmitted && !isCorrect && (
            <View style={styles.correctAnswerContainer}>
              <Text style={styles.correctAnswerLabel}>Correct answer:</Text>
              <Text style={styles.correctAnswerText}>
                {Array.isArray(question.correctAnswer) 
                  ? question.correctAnswer.join(' or ') 
                  : question.correctAnswer}
              </Text>
            </View>
          )}

          {isAnswerSubmitted && question.explanation && showExplanation && (
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationTitle}>Explanation:</Text>
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </View>
          )}

          {isAnswerSubmitted && question.explanation && !showExplanation && (
            <TouchableOpacity 
              style={styles.showExplanationButton}
              onPress={() => setShowExplanation(true)}
            >
              <HelpCircle size={16} color={Colors.primary[600]} />
              <Text style={styles.showExplanationText}>Show explanation</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isAnswerSubmitted ? (
          <TouchableOpacity 
            style={[
              styles.submitButton,
              (!selectedOption && question.type === 'multiple-choice') || 
              (!answer && question.type === 'fill-in-blank') ? 
                styles.disabledButton : {}
            ]}
            onPress={handleSubmitAnswer}
            disabled={(!selectedOption && question.type === 'multiple-choice') || 
                      (!answer && question.type === 'fill-in-blank')}
          >
            <Text style={styles.submitButtonText}>Submit Answer</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.resultContainer}>
            <View style={[
              styles.resultBadge,
              isCorrect ? styles.correctBadge : styles.incorrectBadge
            ]}>
              <Text style={[
                styles.resultBadgeText,
                isCorrect ? styles.correctBadgeText : styles.incorrectBadgeText
              ]}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </Text>
            </View>
            <Text style={styles.timeTakenText}>
              Time taken: {timeTaken} seconds
            </Text>
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNextQuestion}
            >
              <Text style={styles.nextButtonText}>Next Question</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
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
  contentContainer: {
    padding: 16,
  },
  questionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 24,
    lineHeight: 26,
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  correctOption: {
    borderColor: Colors.success[500],
    backgroundColor: Colors.success[50],
  },
  incorrectOption: {
    borderColor: Colors.error[500],
    backgroundColor: Colors.error[50],
  },
  optionText: {
    fontSize: 16,
    color: Colors.gray[700],
    flex: 1,
  },
  selectedOptionText: {
    color: Colors.primary[700],
    fontWeight: '500',
  },
  correctOptionText: {
    color: Colors.success[700],
    fontWeight: '500',
  },
  incorrectOptionText: {
    color: Colors.error[700],
    fontWeight: '500',
  },
  fillInBlankContainer: {
    marginTop: 16,
    position: 'relative',
  },
  fillInBlankInput: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: Colors.gray[800],
    backgroundColor: '#FFFFFF',
  },
  correctInput: {
    borderColor: Colors.success[500],
    backgroundColor: Colors.success[50],
  },
  incorrectInput: {
    borderColor: Colors.error[500],
    backgroundColor: Colors.error[50],
  },
  resultIconContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  correctAnswerContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
  },
  correctAnswerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 4,
  },
  correctAnswerText: {
    fontSize: 16,
    color: Colors.gray[800],
  },
  explanationContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.primary[50],
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[700],
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    color: Colors.gray[800],
    lineHeight: 20,
  },
  showExplanationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  showExplanationText: {
    fontSize: 14,
    color: Colors.primary[600],
    fontWeight: '500',
    marginLeft: 6,
  },
  submitButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.gray[400],
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  correctBadge: {
    backgroundColor: Colors.success[100],
  },
  incorrectBadge: {
    backgroundColor: Colors.error[100],
  },
  resultBadgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  correctBadgeText: {
    color: Colors.success[700],
  },
  incorrectBadgeText: {
    color: Colors.error[700],
  },
  timeTakenText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 24,
  },
  nextButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error[600],
    textAlign: 'center',
  },
});