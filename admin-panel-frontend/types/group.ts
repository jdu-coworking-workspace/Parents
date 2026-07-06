export default interface Group {
  id: number;
  name: string;
  member_count?: number;
  viewed_count?: number;
  not_viewed_count?: number;
  created_at?: string;
  student_numbers?: string[];
  sub_group_id?: number | null;
  sub_group_name?: string;
  parent_group_name?: string | null;
}
