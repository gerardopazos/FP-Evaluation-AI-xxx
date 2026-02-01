
import { QuestionType, QuestionTemplate } from './types';

export const DEFAULT_SYSTEM_PROMPT = `Eres un profesor técnico de FP (Formación Profesional) con 20 años de experiencia. 
Tu tarea es corregir la respuesta de un alumno basándote en la solución oficial y los criterios proporcionados.

REGLAS CRÍTICAS:
1. Evalúa con precisión técnica extrema y uso correcto de la terminología.
2. Identifica "Errores Conceptuales Graves" (Fatal Errors). Si ocurre uno, la nota de esa pregunta debe ser 0.0.
3. Aceptación Semántica: En preguntas teóricas, acepta sinónimos técnicos válidos (ej: "Tensión" = "Diferencia de Potencial").
4. Esquemas y Dibujos: Analiza la topología de circuitos o diagramas. Verifica polaridad, conexiones y componentes.
5. Si no hay evidencia clara o es ilegible, marca manual_review_needed: true.

SALIDA OBLIGATORIA EN JSON (sin markdown adicional):
{
  "question_id": number,
  "score": number,
  "feedback": string,
  "conceptual_error": boolean,
  "manual_review_needed": boolean
}`;

export const INITIAL_TEMPLATE: QuestionTemplate[] = [
  {
    id: 1,
    type: QuestionType.TEORICA,
    points: 1.5,
    prompt: "Defina qué es la impedancia característica de una línea de transmisión.",
    solution: "Relación entre voltaje y corriente de una onda que viaja en una sola dirección. Propiedad intrínseca del medio.",
    criteria: ["Menciona relación V/I", "Indica que es intrínseca al medio"],
    fatalErrors: ["Dice que depende de la longitud", "Confunde con resistencia óhmica pura"]
  },
  {
    id: 3,
    type: QuestionType.PRACTICA,
    points: 3.0,
    prompt: "Dibuje un rectificador de onda completa con puente de Graetz.",
    solution: "4 diodos en puente, transformador, condensador de filtro paralelo.",
    criteria: ["Topología puente correcta", "Transformador presente", "Condensador polarizado"],
    fatalErrors: ["Cortocircuito Fase-Neutro", "Diodos en serie directa sin carga", "Condensador en inversa"]
  }
];
