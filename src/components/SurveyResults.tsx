import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { csvCell, getAnswers, getQuestions, summarizeQuestion, type SurveyPoll, type SurveyResponse } from '@/lib/surveys';

export function SurveyResults({ poll, responses, names, athleteCount }: { poll: SurveyPoll; responses: SurveyResponse[]; names: Record<string, string>; athleteCount: number }) {
  const questions = getQuestions(poll);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [busy, setBusy] = useState(false);
  const sorted = [...responses].sort((a, b) => (names[a.user_id] ?? '').localeCompare(names[b.user_id] ?? ''));
  const priorities = questions.filter(q => q.type !== 'text' && q.improvementOptions?.length).map(q => ({ q, ...summarizeQuestion(q, responses) })).sort((a, b) => b.improvementCount / Math.max(1, b.answered) - a.improvementCount / Math.max(1, a.answered));
  const answerRows = sorted.flatMap(r => questions.map(q => { const answer = getAnswers(r)[q.id]; return [names[r.user_id] ?? 'Jugador', r.updated_at ? new Date(r.updated_at).toLocaleString('es') : '', q.title, Array.isArray(answer) ? answer.join(' · ') : answer ?? '', r.comment ?? '']; }));
  const summaryRows = questions.flatMap(q => summarizeQuestion(q, responses).counts.map(c => [q.title, c.option, c.count, `${c.percentage}%`, q.improvementOptions?.includes(c.option) ? 'Sí' : 'No']));
  async function download(kind: 'csv' | 'pdf') {
    setBusy(true);
    try {
      const filename = `encuesta_${poll.title.replace(/[^a-z0-9áéíóúñ_-]/gi, '_').slice(0, 60)}`;
      if (kind === 'csv') {
        const rows = [['Encuesta', poll.title], ['Participación', `${responses.length}/${athleteCount}`], [], ['Jugador', 'Fecha de respuesta', 'Pregunta', 'Respuesta', 'Comentario'], ...answerRows, [], ['Resumen por pregunta'], ['Pregunta', 'Opción', 'Respuestas', '% de quienes respondieron la pregunta', 'Punto a trabajar'], ...summaryRows];
        const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename + '.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const { exportPdf } = await import('@/lib/pdf-export');
        await exportPdf({ title: poll.title, subtitle: `${responses.length}/${athleteCount} jugadores respondieron`, filename: filename + '.pdf', chartEls: Object.values(chartRefs.current).filter((el): el is HTMLDivElement => el !== null), tables: [
          ...(priorities.length ? [{ title: 'Áreas de mejora señaladas', head: ['Pregunta', 'Jugadores', '%'], rows: priorities.map(p => [p.q.title, p.improvementCount, `${p.answered ? Math.round(p.improvementCount / p.answered * 100) : 0}%`]) }] : []),
          { title: 'Resumen', head: ['Pregunta', 'Opción', 'Respuestas', '%', 'Punto a trabajar'], rows: summaryRows },
          { title: 'Respuestas por jugador', head: ['Jugador', 'Fecha', 'Pregunta', 'Respuesta', 'Comentario'], rows: answerRows },
        ] });
      }
    } catch { toast.error('No se pudo exportar la encuesta'); } finally { setBusy(false); }
  }
  return <div className="border-t border-border p-4 space-y-4">
    <div className="flex flex-wrap justify-between gap-3 items-center"><p className="text-sm font-semibold">{athleteCount ? Math.round(responses.length / athleteCount * 100) : 0}% de participación · {responses.length}/{athleteCount}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy || !responses.length} onClick={() => download('csv')}><Download className="size-4 mr-1" />CSV</Button><Button size="sm" variant="outline" disabled={busy || !responses.length} onClick={() => download('pdf')}><Download className="size-4 mr-1" />PDF</Button></div></div>
    {!responses.length ? <p className="text-sm text-muted-foreground">Sin respuestas todavía.</p> : <Tabs defaultValue="analysis"><TabsList><TabsTrigger value="analysis">Análisis</TabsTrigger><TabsTrigger value="players">Por jugador</TabsTrigger></TabsList>
      <TabsContent value="analysis" className="space-y-5">
        {priorities.length > 0 && <section className="border-b border-border pb-4"><h3 className="text-base mb-2">Puntos de mejora</h3><p className="text-xs text-muted-foreground mb-3">Según las opciones que el cuerpo técnico marcó como «Punto a trabajar».</p>{priorities.map(p => <div key={p.q.id} className="flex justify-between gap-3 text-sm py-2"><span className="min-w-0 break-words">{p.q.title}</span><span className="shrink-0 font-semibold">{p.improvementCount}/{p.answered} · {p.answered ? Math.round(p.improvementCount / p.answered * 100) : 0}%</span></div>)}</section>}
        {questions.map((q, i) => { const summary = summarizeQuestion(q, responses); return <div key={q.id} ref={el => { chartRefs.current[q.id] = el; }} className="space-y-3 bg-background text-foreground p-2"><h3 className="text-base break-words">{i + 1}. {q.title}</h3><p className="text-xs text-muted-foreground">{summary.answered} respuestas{q.type === 'multiple' ? ' · Selección múltiple: los porcentajes pueden sumar más del 100%.' : ''}</p>
          {q.type === 'text' ? <ul className="divide-y divide-border">{sorted.map(r => { const a = getAnswers(r)[q.id]; return typeof a === 'string' && a.trim() ? <li key={r.user_id} className="py-2 text-sm break-words"><span className="font-semibold">{names[r.user_id] ?? 'Jugador'}: </span>{a}</li> : null; })}</ul> : summary.counts.map(c => <div key={c.option} className="space-y-1"><div className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{c.option}</span><span className="shrink-0 tabular-nums">{c.count} · {c.percentage}%</span></div><div role="img" aria-label={`${c.option}: ${c.count} respuestas, ${c.percentage}%`} className="h-3 bg-secondary"><div className="h-full bg-primary" style={{ width: `${c.percentage}%` }} /></div></div>)}
        </div>; })}
      </TabsContent>
      <TabsContent value="players"><div className="divide-y divide-border">{sorted.map(r => <section key={r.user_id} className="py-4 space-y-2"><h3 className="text-base">{names[r.user_id] ?? 'Jugador'}</h3>{questions.map(q => { const a = getAnswers(r)[q.id]; return <div key={q.id} className="text-sm break-words"><p className="font-semibold">{q.title}</p><p className="text-muted-foreground">{Array.isArray(a) ? a.join(' · ') || 'Sin respuesta' : a || 'Sin respuesta'}</p></div>; })}{r.comment && <p className="text-sm italic break-words">{r.comment}</p>}</section>)}</div></TabsContent>
    </Tabs>}
  </div>;
}