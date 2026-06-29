import pagination from "./pagination";
import Student from "./student";

export interface MessageStudent extends Student {
  viewed_at?: string | null;
}

type StudentApi = {
  students: Student[];
  pagination: pagination;
};

export type MessageStudentApi = {
  students: MessageStudent[];
  pagination: pagination;
};

export default StudentApi;
