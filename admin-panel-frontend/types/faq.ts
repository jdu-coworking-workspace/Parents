export const FAQ_AUDIENCES = ["parents", "students"] as const;

export type FaqAudience = (typeof FAQ_AUDIENCES)[number];

export default interface Faq {
  id: number;
  question: string;
  answer: string;
  audience: FaqAudience;
  sort_order: number;
  created_at: string;
  edited_at: string;
}

export interface FaqListResponse {
  faqs: Faq[];
}
