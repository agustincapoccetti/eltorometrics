/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { csvCell, getAnswers, getQuestions, summarizeQuestion, validateAnswers, validateQuestions, type SurveyQuestion, type SurveyResponse } from './surveys';

const q: SurveyQuestion = { id: 'training', title: '¿Qué mejorar?', type: 'multiple', required: true, options: ['Defensa', 'Ataque', 'Nada'], improvementOptions: ['Defensa', 'Ataque'] };
describe('Encuestas personalizables', () => {
  test('permite elegir más de una respuesta en una pregunta múltiple', () => {
    expect(validateAnswers([q], { training: ['Defensa', 'Ataque'] })).toBeNull();
  });
  test('una pregunta de respuesta única rechaza dos opciones', () => {
    expect(validateAnswers([{ ...q, type: 'single' }], { training: ['Defensa', 'Ataque'] })).toBe('Elige una sola opción');
  });
  test('el coach puede redactar preguntas y opciones propias', () => {
    expect(validateQuestions([q])).toBeNull();
    expect(validateAnswers([q], { training: ['No existe'] })).toBe('Opción inválida');
  });
  test('preguntas obligatorias deben responderse y opcionales pueden omitirse', () => {
    expect(validateAnswers([q], {})).toBe('Completa: ¿Qué mejorar?');
    expect(validateAnswers([{ ...q, required: false }], {})).toBeNull();
  });
  test('conserva respuestas de encuestas anteriores', () => {
    const questions = getQuestions({ id: 'old', title: 'Disponibilidad', questions: [], options: ['Sí', 'No'], multi: false });
    expect(questions[0].id).toBe('legacy');
    expect(getAnswers({ answers: {}, selected: ['Sí'] })).toEqual({ legacy: ['Sí'] });
  });
  test('gráficos cuentan opciones y jugadores a mejorar sin duplicar selecciones múltiples', () => {
    const responses: SurveyResponse[] = [{ poll_id: 'p', user_id: 'a', selected: [], comment: null, answers: { training: ['Defensa', 'Ataque'] } }, { poll_id: 'p', user_id: 'b', selected: [], comment: null, answers: { training: ['Defensa'] } }];
    expect(summarizeQuestion(q, responses)).toEqual({ answered: 2, improvementCount: 2, counts: [{ option: 'Defensa', count: 2, percentage: 100 }, { option: 'Ataque', count: 1, percentage: 50 }, { option: 'Nada', count: 0, percentage: 0 }] });
  });
  test('exporta texto sin ejecutar fórmulas de hojas de cálculo', () => {
    expect(csvCell('=2+2')).toBe('"\'=2+2"');
    expect(csvCell('Ataque; "bien"')).toBe('"Ataque; ""bien"""');
  });
});