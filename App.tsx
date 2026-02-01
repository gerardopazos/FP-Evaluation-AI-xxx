
import React, { useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TemplateEditor from './components/TemplateEditor';
import ExamIngestion from './components/ExamIngestion';
import ResultsView from './components/ResultsView';
import { GeminiService } from './services/geminiService';
import { AppState, StudentExam } from './types';
import { INITIAL_TEMPLATE, DEFAULT_SYSTEM_PROMPT } from './constants';
import { Loader2, Database, Download, Upload, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [state, setState] = useState<AppState>({
    template: INITIAL_TEMPLATE,
    exams: [],
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gemini = new GeminiService();

  const handleExamsProcessed = (newExams: StudentExam[]) => {
    setState(prev => ({
      ...prev,
      exams: [...prev.exams, ...newExams]
    }));
    setActiveTab('dashboard');
  };

  const deleteExam = (id: string) => {
    setState(prev => ({
      ...prev,
      exams: prev.exams.filter(e => e.id !== id)
    }));
  };

  const updateManualScore = (examId: string, qId: number, score: number) => {
    setState(prev => {
      const exams = prev.exams.map(e => {
        if (e.id !== examId) return e;
        const corrections = e.corrections.map(c => 
          c.question_id === qId ? { ...c, score } : c
        );
        const totalScore = corrections.reduce((acc, curr) => acc + curr.score, 0);
        return { ...e, corrections, totalScore };
      });
      return { ...prev, exams };
    });
  };

  const runFullCorrection = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const examsToProcess = state.exams.filter(e => e.status === 'pending');
    
    for (const exam of examsToProcess) {
      // Marcamos como procesando
      setState(prev => ({
        ...prev,
        exams: prev.exams.map(e => e.id === exam.id ? { ...e, status: 'processing' as const } : e)
      }));

      try {
        const studentName = await gemini.identifyStudent(exam.pages);
        const corrections = [];
        
        for (const q of state.template) {
          const res = await gemini.correctQuestion(exam.pages, q, state.systemPrompt);
          corrections.push(res);
        }
        
        const totalScore = corrections.reduce((acc, curr) => acc + curr.score, 0);

        setState(prev => ({
          ...prev,
          exams: prev.exams.map(e => e.id === exam.id ? {
            ...e,
            studentName,
            corrections,
            totalScore,
            status: 'completed' as const
          } : e)
        }));
      } catch (error) {
        console.error(`Fallo crítico en examen ${exam.id}:`, error);
        setState(prev => ({
          ...prev,
          exams: prev.exams.map(e => e.id === exam.id ? { ...e, status: 'error' as const } : e)
        }));
      }
    }
    
    setIsProcessing(false);
  };

  const handleExportState = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fp_evaluator_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportState = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.template && json.exams) {
          setState(json);
          alert("Backup restaurado con éxito.");
        }
      } catch (err) {
        alert("Error al importar el archivo.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
                  exams={state.exams} 
                  onCorrectAll={runFullCorrection} 
                  onDeleteExam={deleteExam} 
               />;
      case 'template':
        return <TemplateEditor 
                  template={state.template} 
                  setTemplate={(template) => setState(p => ({...p, template}))} 
               />;
      case 'ingestion':
        return <ExamIngestion onExamsProcessed={handleExamsProcessed} />;
      case 'results':
        return <ResultsView 
                  exams={state.exams} 
                  template={state.template}
                  onUpdateScore={updateManualScore}
               />;
      case 'settings':
        return (
          <div className="p-8 max-w-4xl mx-auto space-y-10 overflow-y-auto h-full pb-24">
            <header className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Configuración</h1>
                <p className="text-slate-500">Ajustes del motor y gestión de persistencia.</p>
              </div>
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100 font-bold text-xs">
                <ShieldCheck size={16} />
                Motor AI Activo
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 text-blue-600">
                  <Database size={24} />
                  <h2 className="text-xl font-bold text-slate-800">Copia de Seguridad</h2>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={handleExportState} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all font-semibold">
                    <Download size={20} /> Exportar Datos
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold">
                    <Upload size={20} /> Importar Datos
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImportState} accept=".json" className="hidden" />
                </div>
              </div>

              <div className="bg-blue-600 rounded-3xl p-8 text-white">
                <h2 className="text-xl font-bold mb-4">Información</h2>
                <div className="space-y-2 text-sm">
                  <p>Preguntas: {state.template.length}</p>
                  <p>Exámenes: {state.exams.length}</p>
                  <p className="opacity-70 mt-4 text-xs italic">El sistema utiliza Gemini 3 Flash para máxima velocidad en visión técnica.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Instrucciones del Sistema</h2>
              <textarea 
                value={state.systemPrompt}
                onChange={(e) => setState(p => ({...p, systemPrompt: e.target.value}))}
                className="w-full h-64 font-mono text-xs p-4 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>
        );
      default:
        return <Dashboard exams={state.exams} onCorrectAll={runFullCorrection} onDeleteExam={deleteExam} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 relative overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
