import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { SurveyAnswers, SurveyQuestion } from '@/lib/surveys';

export function SurveyFields({ questions, answers, onChange, disabled }: { questions: SurveyQuestion[]; answers: SurveyAnswers; onChange: (answers: SurveyAnswers) => void; disabled?: boolean }) {
  return <div className="space-y-5">{questions.map((q, i) => {
    const value = answers[q.id]; const selected = Array.isArray(value) ? value : [];
    return <fieldset key={q.id} disabled={disabled} className="space-y-2 min-w-0"><legend className="mb-2 text-sm font-semibold break-words">{i + 1}. {q.title}{q.required ? ' *' : ''}</legend>
      {q.type === 'text' ? <Textarea aria-label={q.title} value={typeof value === 'string' ? value : ''} onChange={e => onChange({ ...answers, [q.id]: e.target.value })} /> : q.type === 'single' ? <RadioGroup disabled={disabled} value={selected[0] ?? ''} onValueChange={option => onChange({ ...answers, [q.id]: [option] })}>{q.options.map((option, j) => <Label key={option} className="flex items-center gap-3 border border-border p-3 cursor-pointer" htmlFor={`${q.id}-${j}`}><RadioGroupItem value={option} id={`${q.id}-${j}`} /><span className="break-words min-w-0">{option}</span></Label>)}</RadioGroup> : q.options.map((option, j) => <Label key={option} className="flex items-center gap-3 border border-border p-3 cursor-pointer" htmlFor={`${q.id}-${j}`}><Checkbox id={`${q.id}-${j}`} disabled={disabled} checked={selected.includes(option)} onCheckedChange={checked => onChange({ ...answers, [q.id]: checked ? [...selected, option] : selected.filter(o => o !== option) })} /><span className="break-words min-w-0">{option}</span></Label>)}
    </fieldset>;
  })}</div>;
}