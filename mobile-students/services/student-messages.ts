import api from '@/services/api-client';
import type {
  GetMessageResponse,
  ListMessagesRequest,
  ListMessagesResponse,
  Message,
} from '@/types/message';

export async function fetchStudentMessages(
  params: ListMessagesRequest = {}
): Promise<Message[]> {
  const body: ListMessagesRequest = {
    read_post_ids: params.read_post_ids ?? [],
    last_post_id: params.last_post_id ?? 0,
  };

  if (params.last_sent_at) {
    body.last_sent_at = params.last_sent_at;
  }

  const response = await api.post<ListMessagesResponse>('/student/posts', body);
  const posts = response.data?.posts ?? [];

  return posts.map(post => ({
    ...post,
    images: post.image ? [post.image] : post.images ?? null,
  }));
}

export async function fetchStudentMessage(postId: string | number): Promise<Message> {
  const response = await api.get<GetMessageResponse>(`/student/posts/${postId}`);
  const post = response.data?.post;

  if (!post) {
    throw new Error('Message not found');
  }

  return {
    ...post,
    images: post.image ? [post.image] : post.images ?? null,
  };
}

export async function markStudentMessageViewed(postId: number): Promise<void> {
  await api.post('/student/view', { post_id: postId });
}

export async function fetchStudentUnreadCount(): Promise<number> {
  const response = await api.get<{ unread_count: number }>('/student/unread');
  return response.data?.unread_count ?? 0;
}
