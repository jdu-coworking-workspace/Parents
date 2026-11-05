export interface PollVoter {
  voter_type: "student" | "parent";
  voter_id: number;
  given_name: string;
  family_name: string;
  email: string | null;
  student_number: string | null;
  created_at: string;
}

export interface PollOptionResult {
  id: number;
  text: string;
  votes: number | null;
  percent: number | null;
  voters?: PollVoter[];
}

export interface AdminPollResult {
  id: number;
  question?: string | null;
  total_votes: number | null;
  options: PollOptionResult[];
}

export default interface postView {
  admin: {
    id: number;
    name: string;
  };
  post: {
    id: number;
    title: string;
    description: string;
    priority: string;
    edited_at: string;
    sent_at: string;
    read_count: string;
    unread_count: string;
    image: string;
    images?: string[];
  };
  poll?: AdminPollResult | null;
  polls?: AdminPollResult[];
}
