
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { QuestionTemplate, CorrectionResult, QuestionType } from "./types";

export class GeminiService {
  async correctQuestion(
    pageImages: string[], 
    question: QuestionTemplate, 
    systemPrompt: string
  ): Promise<CorrectionResult> {
    // Instanciamos justo antes de la llamada para asegurar el uso de la API Key actual
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    
    const imageParts = pageImages.map(base64 => ({
      inlineData: {
        data: base64.split(',')[1] || base64,
        mimeType: 'image/png'
      }
    }));

    const textPart = {
      text: `
        ESTRUCTURA DE LA PREGUNTA:
        ID: ${question.id}
        Tipo: ${question.type}
        Puntos Max: ${question.points}
        Enunciado: ${question.prompt}
        
        SOLUCIÓN DE REFERENCIA:
        ${question.solution}
        
        CRITERIOS DE EVALUACIÓN:
        ${question.criteria.map(c => "- " + c).join('\n')}
        
        ERRORES CONCEPTUALES (NOTA 0 SI APARECEN):
        ${question.fatalErrors.map(e => "- " + e).join('\n')}
        
        Analiza las imágenes adjuntas del examen del alumno y genera la corrección siguiendo estrictamente el JSON solicitado.
      `
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { parts: [...imageParts, textPart] },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    
    return {
      question_id: question.id,
      score: Number(parsed.score) || 0,
      feedback: parsed.feedback || "Sin feedback generado.",
      conceptual_error: !!parsed.conceptual_error,
      manual_review_needed: !!parsed.manual_review_needed
    };
  }

  async identifyStudent(pageImages: string[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const firstPage = pageImages[0];
    
    if (!firstPage) return "Alumno Desconocido";

    const imagePart = {
      inlineData: {
        data: firstPage.split(',')[1] || firstPage,
        mimeType: 'image/png'
      }
    };

    const response = await ai.models.generateContent({
      model,
      contents: { 
        parts: [
          imagePart, 
          { text: "Identifica el nombre del alumno que suele estar en la parte superior del examen. Responde solo con el nombre." }
        ] 
      }
    });
    return response.text?.trim() || "Alumno Desconocido";
  }

  async extractTemplateFromImages(pageImages: string[]): Promise<QuestionTemplate[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-preview';
    
    const imageParts = pageImages.map(base64 => ({
      inlineData: {
        data: base64.split(',')[1] || base64,
        mimeType: 'image/png'
      }
    }));

    const promptText = `
      Analiza las imágenes de este documento de evaluación técnica/docente. 
      Extrae todas las preguntas de examen y genera una lista estructurada.
      
      Para cada pregunta, identifica:
      1. El enunciado (prompt).
      2. La solución de referencia ideal.
      3. Criterios de evaluación positivos (qué suma puntos).
      4. Errores conceptuales graves (qué anula la pregunta o resta significativamente).
      5. Puntuación asignada. Si no aparece, divide 10 entre el número de preguntas detectadas.
      6. El tipo de pregunta entre: 'Teórica', 'Práctica/Esquema', 'Script/Comando', 'Test'.

      RESPONDE ÚNICAMENTE CON UN ARRAY JSON.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [...imageParts, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              type: { type: Type.STRING, enum: Object.values(QuestionType) },
              points: { type: Type.NUMBER },
              prompt: { type: Type.STRING },
              solution: { type: Type.STRING },
              criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
              fatalErrors: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["id", "type", "points", "prompt", "solution", "criteria", "fatalErrors"]
          }
        }
      }
    });

    const text = response.text || '[]';
    return JSON.parse(text);
  }
}
