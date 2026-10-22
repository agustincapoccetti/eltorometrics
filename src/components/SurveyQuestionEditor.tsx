import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { newQuestion, type SurveyQuestion } from '@/lib/surveys';

export function SurveyQuestionEditor({ questions, onChange }: { questions: SurveyQuestion[]; onChange: (q: SurveyQuestion[]) => void }) {
  const update = (index: number, changes: Partial<SurveyQuestion>) => onChange(questions.map((q, i) => i === index ? { ...q, ...changes } : q));
  const move = (index: number, direction: number) => { const next = [...questions]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onChange(next); };
  return <div className="space-y-5">
    {questions.map((q, i) => <section key={q.id} className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between gap-2"><h2 className="text-base">Pregunta {i + 1}</h2><div className="flex gap-1">
        <Button variant="ghost" size="icon" title="Subir pregunta" aria-label={`Subir pregunta ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
        <Button variant="ghost" size="icon" title="Bajar pregunta" aria-label={`Bajar pregunta ${i + 1}`} disabled={i === questions.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
        <Button variant="ghost" size="icon" title="Eliminar pregunta" aria-label={`Eliminar pregunta ${i + 1}`} onClick={() => onChange(questions.filter(x => x.id !== q.id))}><Trash2 className="size-4" /></Button>
      </div></div>
      <Input aria-label={`Pregunta ${i + 1}`} value={q.title} placeholder="¿Qué quieres preguntarle al plantel?" onChange={e => update(i, { title: e.target.value })} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={q.type} onValueChange={type => update(i, { type: type as SurveyQuestion['type'] })}><SelectTrigger className="w-full sm:w-60" aria-label={`Tipo de pregunta ${i + 1}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Una respuesta</SelectItem><SelectItem value="multiple">Varias respuestas</SelectItem><SelectItem value="text">Respuesta escrita</SelectItem></SelectContent></Select>
        <Label className="flex items-center gap-2">Obligatoria<Switch checked={q.required} onCheckedChange={required => update(i, { required })} /></Label>
      </div>
      {q.type !== 'text' && <div className="space-y-2">
        {q.options.map((option, j) => <div key={j} className="flex flex-wrap items-center gap-2">
          <Input className="flex-1 min-w-40" aria-label={`Pregunta ${i + 1}, opción ${j + 1}`} value={option} placeholder={`Opción ${j + 1}`} onChange={e => update(i, { options: q.options.map((o, k) => k === j ? e.target.value : o), improvementOptions: q.improvementOptions.map(o => o === option ? e.target.value : o) })} />
          <Label className="flex items-center gap-1 text-xs"><Checkbox checked={q.improvementOptions.includes(option) && !!option} disabled={!option.trim()} onCheckedChange={checked => update(i, { improvementOptions: checked ? [...q.improvementOptions, option] : q.improvementOptions.filter(o => o !== option) })} />Indica mejora</Label>
          <Button variant="ghost" size="icon" title="Eliminar opción" aria-label={`Eliminar opción ${j + 1} de pregunta ${i + 1}`} onClick={() => update(i, { options: q.options.filter((_, k) => k !== j), improvementOptions: q.improvementOptions.filter(o => o !== option) })}><Trash2 className="size-4" /></Button>
        </div>)}
        <Button variant="outline" size="sm" onClick={() => update(i, { options: [...q.options, ''] })}><Plus className="size-4 mr-2" />Agregar opción</Button>
      </div>}
    </section>)}
    <Button variant="outline" onClick={() => onChange([...questions, newQuestion()])}><Plus className="size-4 mr-2" />Agregar pregunta</Button>
  </div>;
}