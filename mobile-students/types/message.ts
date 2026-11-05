import type { Poll } from '@/components/PollView';
export interface Message {
  id: number;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  group_name: string | null;
  edited_at: string;
  images?: string[] | null;
  image?: string | null;
  sent_time: string;
  viewed_at: string | null;
  post_id?: number;
  poll?: Poll | null;
  polls?: Poll[];
}

export interface ListMessagesRequest {
  last_post_id?: number;
  last_sent_at?: string | null;
  read_post_ids?: number[];
}

export interface ListMessagesResponse {
  posts: Message[];
  message: string;
}

export interface GetMessageResponse {
  post: Message;
  message: string;
}
