export interface PollOptionResult {
  id: number;
  text: string;
  votes: number | null;
  percent: number | null;
}

export interface PollResult {
  id: number;
  question: string;
  options: PollOptionResult[];
  total_votes: number | null;
  my_option_id: number | null;
  results_visible: boolean;
}

export interface PollSummary {
  id: number;
  question: string;
}
