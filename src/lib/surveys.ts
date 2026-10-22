import type { Json } from '@/integrations/supabase/types';

export type SurveyQuestion = { id: string; title: string; type: 'single' | 'multiple' | 'text'; required: boolean; options: string[]; improvementOptions: string[] };
export type SurveyAnswers = Record<string, string | string[]>;
export type SurveyPoll = { id: string; title: string; description: string | null; options: string[]; multi: boolean; active: boolean; closes_at: string | null; event_date: string | null; created_at?: string; questions: Json };
export type SurveyResponse = { poll_id: string; user_id: string; selected: string[]; comment: string | null; answers: Json; updated_at?: string };

export function newQuestion(): SurveyQuestion {
  return { id: crypto.randomUUID(), title: '', type: 'single', required: true, options: ['', ''], improvementOptions: [] };
}

export function getQuestions(poll: Pick<SurveyPoll, 'id' | 'title' | 'questions' | 'options' | 'multi'>): SurveyQuestion[] {
  if (Array.isArray(poll.questions) && poll.questions.length) return poll.questions as unknown as SurveyQuestion[];
  return [{ id: 'legacy', title: poll.title, type: poll.multi ? 'multiple' : 'single', required: true, options: poll.options, improvementOptions: [] }];
}

export function getAnswers(response?: Pick<SurveyResponse, 'answers' | 'selected'>): SurveyAnswers {
  if (!response) return {};
  const answers = response.answers;
  return answers && !Array.isArray(answers) && typeof answers === 'object' && Object.keys(answers).length
    ? answers as SurveyAnswers : { legacy: response.selected };
}

export function validateQuestions(questions: SurveyQuestion[]): string | null {
  if (!questions.length) return 'Agrega al menos una pregunta';
  for (const q of questions) {
    if (!q.title.trim()) return 'Redacta todas las preguntas';
    if (q.type !== 'text') {
      const opts = q.options.map(o => o.trim()).filter(Boolean);
      if (opts.length < 2) return 'Cada pregunta de elección necesita al menos dos opciones';
      if (new Set(opts).size !== opts.length) return 'Las opciones de una pregunta no deben repetirse';
    }
  }
  return null;
}

export function validateAnswers(questions: SurveyQuestion[], answers: SurveyAnswers): string | null {
  for (const q of questions) {
    const a = answers[q.id];
    if (q.type === 'text') {
      if (a !== undefined && typeof a !== 'string') return 'Respuesta de texto inválida';
      if (q.required && (typeof a !== 'string' || !a.trim())) return `Completa: ${q.title}`;
    } else {
      if (a !== undefined && !Array.isArray(a)) return 'Opciones inválidas';
      const selected = Array.isArray(a) ? a : [];
      if (q.required && !selected.length) return `Completa: ${q.title}`;
      if (q.type === 'single' && selected.length > 1) return 'Elige una sola opción';
      if (selected.some(o => !q.options.includes(o))) return 'Opción inválida';
    }
  }
  return null;
}

export function summarizeQuestion(q: SurveyQuestion, responses: SurveyResponse[]) {
  const answered = responses.filter(r => { const a = getAnswers(r)[q.id]; return Array.isArray(a) ? a.length > 0 : typeof a === 'string' && !!a.trim(); });
  const counts = q.options.map(option => ({ option, count: answered.filter(r => { const a = getAnswers(r)[q.id]; return Array.isArray(a) && a.includes(option); }).length }));
  const improvementCount = answered.filter(r => { const a = getAnswers(r)[q.id]; return Array.isArray(a) && a.some(o => (q.improvementOptions ?? []).includes(o)); }).length;
  return { answered: answered.length, counts: counts.map(c => ({ ...c, percentage: answered.length ? Math.round(c.count / answered.length * 100) : 0 })), improvementCount };
}

export function csvCell(value: string | number) {
  const text = String(value);
  return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
}