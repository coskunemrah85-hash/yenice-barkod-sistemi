import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface UpdateInfo {
  version: string;
  changelog: string;
  releaseDate: string;
  downloadUrl?: string;
}

interface UpdateCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  isUpdating: boolean;
  onUpdate: () => void;
  currentVersion: string;
}

const UpdateCheckModal: React.FC<UpdateCheckModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  isChecking,
  isUpdating,
  onUpdate,
  currentVersion,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-cyan-500 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="refresh" className="w-8 h-8 text-white animate-spin" style={{ animationPlayState: isChecking ? 'running' : 'paused' }} />
            <h2 className="text-2xl font-bold text-white">Güncelleme Kontrol</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="text-white hover:bg-cyan-700 p-2 rounded-lg disabled:opacity-50"
          >
            <Icon name="x-circle" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {isChecking ? (
            <div className="text-center py-12">
              <div className="inline-block">
                <Icon name="refresh" className="w-12 h-12 text-cyan-600 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Güncellemeler kontrol ediliyor...</p>
              </div>
            </div>
          ) : updateInfo ? (
            <div className="space-y-6">
              {/* Version Info */}
              <div className="bg-cyan-50 dark:bg-slate-700 rounded-lg p-4 border border-cyan-300 dark:border-cyan-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold">Mevcut Sürüm</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{currentVersion}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold">Yeni Sürüm</p>
                    <p className="text-2xl font-bold text-cyan-600">{updateInfo.version}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                  📅 Yayınlanma: {new Date(updateInfo.releaseDate).toLocaleDateString('tr-TR')}
                </p>
              </div>

              {/* Changelog */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Icon name="list-bullet" className="w-5 h-5 text-cyan-600" />
                  Değişiklikler
                </h3>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                  <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                    {updateInfo.changelog || 'Değişiklik detayı yok.'}
                  </div>
                </div>
              </div>

              {/* Info Message */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                  <Icon name="check" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Güncelleme yüklenip kurulduktan sonra uygulama yeniden başlatılacaktır.</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Icon name="check" className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sistem Güncel!</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Uygulamanız en son sürüme sahip. ({currentVersion})
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 px-8 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-6 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 transition"
          >
            Kapat
          </button>
          {updateInfo && (
            <button
              onClick={onUpdate}
              disabled={isUpdating}
              className="px-6 py-2 rounded-lg font-bold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Icon name="refresh" className="w-4 h-4 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <Icon name="download" className="w-4 h-4" />
                  Şimdi Güncelle
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateCheckModal;
