export interface ChatRequest {
  question: string;
  note_ids?: string[];
}

export interface ChatResponse {
  answer: string;
  used_note_ids: string[];
}
