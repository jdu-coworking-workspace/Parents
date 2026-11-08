import apiClient from '@/services/api-client';

export type ParentFaq = {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  edited_at: string;
};

type ParentFaqResponse = {
  faqs: ParentFaq[];
  updated_at: string | null;
};

export async function fetchParentFaqs(): Promise<ParentFaq[]> {
  const response = await apiClient.get<ParentFaqResponse>('/faq');
  return response.data?.faqs ?? [];
}
