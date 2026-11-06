import api from "@/services/api-client";

export type StudentFaq = {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  edited_at: string;
};

type StudentFaqResponse = {
  faqs: StudentFaq[];
  updated_at: string | null;
};

export async function fetchStudentFaqs(): Promise<StudentFaq[]> {
  const response = await api.get<StudentFaqResponse>("/student/faq");
  return response.data?.faqs ?? [];
}
