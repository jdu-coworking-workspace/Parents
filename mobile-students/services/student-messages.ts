import api from '@/services/api-client';
import DemoModeService from '@/services/demo-mode-service';
import type {
  GetMessageResponse,
  ListMessagesRequest,
  ListMessagesResponse,
  Message,
} from '@/types/message';

export async function fetchStudentMessages(
  params: ListMessagesRequest = {}
): Promise<Message[]> {
  if (await DemoModeService.isDemoModeActive()) {
    await DemoModeService.simulateNetworkDelay(300, 800);
    return DemoModeService.getDemoMessages(params);
  }

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
  if (await DemoModeService.isDemoModeActive()) {
    await DemoModeService.simulateNetworkDelay(300, 800);
    const post = DemoModeService.getDemoMessage(postId);

    if (!post) {
      throw new Error('Message not found');
    }

    return post;
  }

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
  if (await DemoModeService.isDemoModeActive()) {
    DemoModeService.markDemoMessageViewed(postId);
    return;
  }

  await api.post('/student/view', { post_id: postId });
}

export async function fetchStudentUnreadCount(): Promise<number> {
  if (await DemoModeService.isDemoModeActive()) {
    await DemoModeService.simulateNetworkDelay(150, 400);
    return DemoModeService.getDemoUnreadCount();
  }

  const response = await api.get<any>('/student/unread');
  const data = response.data;

  if (Array.isArray(data)) {
    return data[0]?.unread_count !== undefined ? Number(data[0].unread_count) : 0;
  }

  if (data && typeof data === 'object') {
    return data.unread_count !== undefined ? Number(data.unread_count) : 0;
  }

  return 0;
}
