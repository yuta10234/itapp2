// Quiz types
export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'fill-in-blank';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizProgress {
  id: string;
  question_id: string;
  is_correct: boolean;
  answered_at: string;
  time_taken: number;
  user_id: string;
}

// Article types
export interface Article {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ArticleProgress {
  id: string;
  article_id: string;
  read_at: string;
  read_count: number;
  user_id: string;
}

// Supabase types
export interface Database {
  public: {
    Tables: {
      quiz_progress: {
        Row: {
          id: string;
          question_id: string;
          is_correct: boolean;
          answered_at: string;
          time_taken: number;
          user_id: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          is_correct: boolean;
          answered_at?: string;
          time_taken: number;
          user_id: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          is_correct?: boolean;
          answered_at?: string;
          time_taken?: number;
          user_id?: string;
        };
      };
      article_progress: {
        Row: {
          id: string;
          article_id: string;
          read_at: string;
          read_count: number;
          user_id: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          read_at?: string;
          read_count: number;
          user_id: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          read_at?: string;
          read_count?: number;
          user_id?: string;
        };
      };
      articles: {
        Row: {
          id: string;
          title: string;
          content: string;
          image_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          image_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          image_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
  };
}