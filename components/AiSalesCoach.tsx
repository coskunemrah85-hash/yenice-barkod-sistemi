
import React, { useState, useCallback } from 'react';
import { Product, SaleRecord } from '../types';
import { getSalesCoaching } from '../services/geminiService';
import Icon from './Icon';
import Markdown from 'react-markdown';

interface AiSalesCoachProps {
  salesHistory: SaleRecord[];
  products: Product[];
}

const AiSalesCoach: React.FC<AiSalesCoachProps> = ({ salesHistory, products }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await getSalesCoaching(salesHistory, products);
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bilinmeyen bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, [salesHistory, products]);

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-200/80 h-full flex flex-col">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
        <Icon name="ai" className="w-6 h-6 text-pink-500"/>
        Yapay Zeka Satış Koçu
      </h2>
      
      {isLoading ? (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-500">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mb-4"></div>
          <p className="font-semibold">Satış verileri analiz ediliyor...</p>
          <p className="text-sm">Lütfen bekleyin.</p>
        </div>
      ) : error ? (
        <div className="flex-grow flex flex-col items-center justify-center text-red-600 bg-red-50 rounded-lg p-4">
            <Icon name="exclamation-triangle" className="w-8 h-8 mb-2"/>
            <p className="font-semibold">Analiz Başarısız</p>
            <p className="text-sm text-center">{error}</p>
        </div>
      ) : analysis ? (
        <div className="flex-grow overflow-y-auto pr-2">
            <div className="markdown-body prose prose-sm max-w-none">
                <Markdown>{analysis}</Markdown>
            </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500">
            <p className="mb-4">Son 30 günlük satış verilerinizi analiz ederek size özel öneriler ve uyarılar alın.</p>
            <button
                onClick={handleAnalyze}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md hover:shadow-pink-500/40 flex items-center gap-2"
            >
                <Icon name="check" className="w-5 h-5"/>
                Analiz Yap
            </button>
        </div>
      )}
      
       {analysis && !isLoading && (
         <div className="pt-4 mt-4 border-t">
            <button
                onClick={handleAnalyze}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
                <Icon name="refresh" className="w-5 h-5"/>
                Analizi Yenile
            </button>
         </div>
       )}
    </div>
  );
};

export default AiSalesCoach;
