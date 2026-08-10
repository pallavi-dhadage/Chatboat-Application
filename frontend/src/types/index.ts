/**
 * Shared TypeScript interfaces for ChatFlow AI frontend.
 * All API response shapes, store interfaces, and shared types are defined here.
 */
import type React from 'react';// ---------------------------------------------------------------------------
// API Data Models
// ---------------------------------------------------------------------------

/** Authenticated user returned by /api/v1/users/me and /api/v1/auth/login */
export interface User {
  /** Unique user UUID */
  id: string;
  /** User's email address */
  email: string;
  /** Display name */
  name: string;
  /** Role determines access level */
  role: 'user' | 'moderator' | 'admin';
  /** S3 presigned URL for avatar image, null if not set */
  avatar_url: string | null;
  /** Short status message shown in presence indicator */
  status: string | null;
  /** User biography text */
  bio: string | null;
}

/** Conversation object returned by /api/v1/conversations */
export interface Conversation {
  /** Unique conversation UUID */
  id: string;
  /** Display name of the conversation */
  name: string;
  /** Whether this is a 1:1 or group conversation */
  type: 'direct' | 'group';
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** Preview text of the most recent message, null if no messages */
  last_message: string | null;
  /** ISO 8601 timestamp of the most recent message */
  last_message_time: string | null;
  /** Count of unread notifications for this conversation */
  unread_count: number;
}

/** Single message returned by /api/v1/conversations/:id/messages */
export interface Message {
  /** Unique message UUID */
  id: string;
  /** ID of the conversation this message belongs to */
  conversation_id: string;
  /** ID of the user who sent this message */
  sender_id: string;
  /** Display name of the sender */
  sender_name: string;
  /** Avatar URL of the sender, null if not set */
  sender_avatar: string | null;
  /** Text content of the message, null for file-only messages */
  text: string | null;
  /** S3 presigned URL for attached file, null if no attachment */
  file_url: string | null;
  /** Sentiment label assigned by the AI pipeline */
  sentiment_label: 'positive' | 'neutral' | 'negative' | null;
  /** Confidence score for the sentiment label, 0.0–1.0 */
  sentiment_score: number | null;
  /** True when the message was flagged by the classifier */
  flagged: boolean;
  /** ISO 8601 creation timestamp */
  created_at: string;
}

/** Notification object returned by /api/v1/notifications */
export interface Notification {
  /** Unique notification UUID */
  id: string;
  /** ID of the user this notification belongs to */
  user_id: string;
  /** Notification type identifier, e.g. 'new_message' */
  type: string;
  /** Flexible payload containing notification-specific data */
  payload: Record<string, unknown>;
  /** ISO 8601 timestamp when the notification was read, null if unread */
  read_at: string | null;
  /** ISO 8601 creation timestamp */
  created_at: string;
}

/** Analytics payload returned by /api/v1/analytics */
export interface AnalyticsPayload {
  /** Total number of messages sent on the platform */
  message_volume: number;
  /** Number of distinct active users */
  active_users: number;
  /** Number of messages flagged by the classifier */
  flagged_message_count: number;
  /** Average AI response time in milliseconds */
  response_time_ms: number;
  /** Daily sentiment distribution time-series */
  sentiment_trend: SentimentDataPoint[];
  /** AI feature usage statistics */
  ai_insights: AIInsights;
}

/** A single day's sentiment distribution data point */
export interface SentimentDataPoint {
  /** ISO date string, e.g. '2024-01-15' */
  date: string;
  /** Fraction of messages classified as positive, 0.0–1.0 */
  positive: number;
  /** Fraction of messages classified as neutral, 0.0–1.0 */
  neutral: number;
  /** Fraction of messages classified as negative, 0.0–1.0 */
  negative: number;
}

/** AI feature usage stats nested in AnalyticsPayload */
export interface AIInsights {
  /** Total smart reply requests made */
  smart_reply_requests: number;
  /** Number of smart reply requests served from cache */
  cache_hits: number;
  /** Average AI endpoint latency in milliseconds */
  avg_latency_ms: number;
}

/** Response from /api/v1/ai/smart-replies */
export interface AISmartReplyResponse {
  /** Array of 2–3 suggested reply strings */
  replies: string[];
  /** True when response came from Groq, false when using fallback */
  ai_powered: boolean;
}

/** Response from /api/v1/ai/sentiment */
export interface AISentimentResponse {
  /** Sentiment classification */
  label: 'positive' | 'neutral' | 'negative';
  /** Confidence score 0.0–1.0 */
  score: number;
  /** One-sentence explanation of the classification */
  explanation: string;
}

/** Auth response from /api/v1/auth/login and /api/v1/auth/register */
export interface AuthResponse {
  /** Short-lived JWT access token */
  access_token: string;
  /** Long-lived JWT refresh token */
  refresh_token: string;
  /** The authenticated user's profile */
  user: User;
}

/** Paginated messages response from /api/v1/conversations/:id/messages */
export interface PaginatedMessages {
  /** Messages for the current page, ordered by created_at DESC */
  messages: Message[];
  /** Current page number (1-indexed) */
  page: number;
  /** Number of messages per page */
  page_size: number;
  /** Total message count across all pages */
  total: number;
  /** True if there are more pages after this one */
  has_next: boolean;
}

// ---------------------------------------------------------------------------
// Zustand Store Interfaces
// ---------------------------------------------------------------------------

/** Shape and actions of the Auth_Store (src/store/authStore.ts) */
export interface AuthState {
  /** Current JWT access token, null if unauthenticated */
  token: string | null;
  /** Current JWT refresh token, null if unauthenticated */
  refreshToken: string | null;
  /** Authenticated user object, null if unauthenticated */
  user: User | null;
  /** Derived boolean — true when token is non-null */
  isAuthenticated: boolean;
  /** Populate store after successful login or token refresh */
  setAuth: (token: string, refreshToken: string, user: User) => void;
  /** Clear all auth state and localStorage entries */
  clearAuth: () => void;
  /** Update the user object in store and localStorage after profile patch */
  setUser: (user: User) => void;
}

/** Shape and actions of the Chat_Store (src/store/chatStore.ts) */
export interface ChatState {
  /** All conversations the current user is a participant of */
  conversations: Conversation[];
  /** ID of the conversation currently open in ChatPage */
  activeConversationId: string | null;
  /** Map of conversation ID → messages array */
  messages: Record<string, Message[]>;
  /** Map of conversation ID → array of display names currently typing */
  typingUsers: Record<string, string[]>;
  /** Replace the full conversations list */
  setConversations: (conversations: Conversation[]) => void;
  /** Set or clear the active conversation */
  setActiveConversation: (id: string | null) => void;
  /** Append a single message to a conversation's message list */
  addMessage: (conversationId: string, message: Message) => void;
  /** Update the typing users list for a conversation */
  setTypingUsers: (conversationId: string, users: string[]) => void;
}

/** Shape and actions of the UI_Store (src/store/uiStore.ts) */
export interface UIState {
  /** Whether the sidebar is expanded (true) or collapsed (false) */
  sidebarOpen: boolean;
  /** Identifier of the currently active view, matches route path */
  activeView: string;
  /** Current color theme */
  theme: 'light' | 'dark';
  /** Flip sidebarOpen */
  toggleSidebar: () => void;
  /** Explicitly set sidebar open state */
  setSidebarOpen: (open: boolean) => void;
  /** Update the active view identifier */
  setActiveView: (view: string) => void;
  /** Toggle between light and dark, persist to localStorage, update DOM */
  toggleTheme: () => void;
}

// ---------------------------------------------------------------------------
// Form Value Types (derived from Zod schemas in features/auth/schemas.ts)
// ---------------------------------------------------------------------------

/** Values from the login form */
export interface LoginFormValues {
  email: string;
  password: string;
}

/** Values from the registration form */
export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Values from the profile settings form */
export interface ProfileFormValues {
  name: string;
  status?: string;
  bio?: string;
}

// ---------------------------------------------------------------------------
// Component Prop Types
// ---------------------------------------------------------------------------

/** Props for the MetricCard dashboard component */
export interface MetricCardProps {
  /** KPI label shown above the value */
  label: string;
  /** Formatted value string, e.g. "1,234" or "380ms" */
  value: string;
  /** Trend direction for visual indicator */
  trend?: 'up' | 'down' | 'neutral';
  /** Functional icon component shown on the card */
  icon: React.ComponentType<{ className?: string }>;
  /** Decorative SVG accent component for the top-right corner */
  decorativeIcon: React.ComponentType<{ className?: string }>;
  /** TailwindCSS gradient class names for the card background */
  gradientClassName?: string;
}

/** Props for SVG doodle decoration components */
export interface DoodleProps {
  /** TailwindCSS opacity and color override classes */
  className?: string;
}

/** Props for the Skeleton placeholder component */
export interface SkeletonProps {
  /** TailwindCSS width class, e.g. "w-32" */
  width?: string;
  /** TailwindCSS height class, e.g. "h-4" */
  height?: string;
  /** TailwindCSS border-radius class, e.g. "rounded-full" */
  rounded?: string;
  /** Additional className overrides */
  className?: string;
}
