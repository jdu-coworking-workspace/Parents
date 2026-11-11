import Admin from "./admin";
import type { PollSummary } from "./poll";

export default interface Post {
  id: number;
  title: string;
  description: string;
  priority: string;
  admin?: Admin;
  sent_at: string;
  edited_at: string;
  read_percent: string;
  group_names?: string;
  student_numbers?: string;
  image: string;
  images?: string[];
  poll?: PollSummary | null;
}
