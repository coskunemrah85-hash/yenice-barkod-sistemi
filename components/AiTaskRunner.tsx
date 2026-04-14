
import React, { useState } from 'react';
import { AITask } from '../types';
import Icon from './Icon';

interface AiTaskRunnerProps {
  tasks: AITask[];
  onReview: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
}

const AiTaskRunner: React.FC<AiTaskRunnerProps> = ({ tasks, onReview, onDismiss }) => {
  const [isOpen, setIsOpen] = useState(false);

  const processingTasks = tasks.filter(t => t.status === 'processing').length;
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'error').length;

  const getStatusIndicator = (status: AITask['status']) => {
    switch (status) {
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>;
      case 'completed':
        return <Icon name="check" className="w-5 h-5 text-green-500" />;
      case 'error':
        return <Icon name="x-circle" className="w-5 h-5 text-red-500" />;
    }
  };
  
  const getStatusText = (status: AITask['status']) => {
      switch (status) {
          case 'processing': return "İşleniyor...";
          case 'completed': return "Tamamlandı";
          case 'error': return "Hata Oluştu";
      }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-200 transition-colors"
      >
        <Icon name="ai" className={`w-6 h-6 text-pink-600 ${processingTasks > 0 ? 'animate-pulse' : ''}`} />
        {completedTasks > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
            {completedTasks}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-300 rounded-lg shadow-xl z-30">
          <div className="p-3 font-semibold text-slate-700 border-b">Yapay Zeka Görevleri</div>
          {tasks.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aktif görev bulunmuyor.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {tasks.map(task => (
                <li key={task.id} className="p-3 border-b last:border-0 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIndicator(task.status)}
                      <div>
                        <p className="text-sm font-medium text-slate-800 truncate" title={task.fileName}>{task.fileName}</p>
                        <p className="text-xs text-slate-500">{getStatusText(task.status)}</p>
                      </div>
                    </div>
                     <div className="flex items-center gap-1">
                        {task.status === 'completed' && (
                             <button onClick={() => onReview(task.id)} className="text-sm bg-cyan-100 text-cyan-800 hover:bg-cyan-200 font-semibold py-1 px-3 rounded-md">İncele</button>
                        )}
                        {task.status !== 'processing' && (
                             <button onClick={() => onDismiss(task.id)} className="p-1 text-slate-400 hover:text-red-600 rounded-full"><Icon name="trash" className="w-4 h-4"/></button>
                        )}
                     </div>
                  </div>
                   {task.status === 'error' && <p className="text-xs text-red-600 mt-1 pl-8">{task.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default AiTaskRunner;
