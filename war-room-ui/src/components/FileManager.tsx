import React, { useState } from 'react';
import { UploadCloud, Download, FileText, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { FileManifest } from '../types';

interface FileManagerProps {
  manifest: FileManifest | null;
  canDownload: boolean;
  onUploadFile: (file: File) => void;
  onGenerateAndUpload: (sizeMb: number) => void;
  onDownload: () => void;
  isUploading: boolean;
}

export const FileManager: React.FC<FileManagerProps> = ({
  manifest,
  canDownload,
  onUploadFile,
  onGenerateAndUpload,
  onDownload,
  isUploading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <UploadCloud className="w-4 h-4" /> Ingestion & File Manager
        </h3>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          Max Payload: 50 MB
        </span>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
        }`}
      >
        <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-80" />
        <label className="cursor-pointer">
          <span className="text-xs font-mono font-bold text-cyan-300 hover:underline">
            Choose a file
          </span>
          <span className="text-xs font-mono text-slate-400"> or drag & drop here</span>
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
        <p className="text-[10px] font-mono text-slate-500 mt-1">
          Supports binary payloads, media, PDFs, or archives up to 50 MB
        </p>
      </div>

      {/* Fast Demo Ingestion Buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onGenerateAndUpload(10)}
          disabled={isUploading}
          className="flex items-center justify-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg py-2 font-mono text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" /> Upload 10MB Test
        </button>
        <button
          onClick={() => onGenerateAndUpload(50)}
          disabled={isUploading}
          className="flex items-center justify-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg py-2 font-mono text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5 text-purple-400" /> Upload 50MB Stress
        </button>
      </div>

      {/* Upload Progress Banner */}
      {isUploading && (
        <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-center font-mono text-xs text-cyan-400 animate-pulse">
          Encoding RS(8,4) & writing real disk shards to 12 nodes...
        </div>
      )}

      {/* Manifest Metadata */}
      {manifest && (
        <div className="mt-4 bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-cyan-400" /> Active File:
            </span>
            <span className="text-white font-bold truncate max-w-[180px]">{manifest.filename}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Original Size:</span>
            <span className="text-white">{(manifest.original_size / (1024 * 1024)).toFixed(2)} MB ({manifest.original_size.toLocaleString()} bytes)</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">RS(8,4) Overhead:</span>
            <span className="text-emerald-400 font-bold">1.50x (vs 3.00x in 3x repl)</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Original Blake3 Digest:</span>
            <div className="bg-black/60 p-1 rounded text-[10px] text-cyan-300 break-all border border-slate-800">
              {manifest.original_blake3}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Binary Merkle Root (12 Shards):</span>
            <div className="bg-black/60 p-1 rounded text-[10px] text-purple-300 break-all border border-slate-800">
              {manifest.merkle_root}
            </div>
          </div>
        </div>
      )}

      {/* Download Action */}
      <div className="mt-4">
        <button
          onClick={onDownload}
          disabled={!canDownload}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-xs font-bold transition-all ${
            canDownload
              ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/30 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <Download className="w-4 h-4" />
          {canDownload ? 'DOWNLOAD RECOVERED FILE (BIT-EXACT)' : 'DOWNLOAD STANDBY (RECONSTRUCT FIRST)'}
        </button>
      </div>
    </div>
  );
};
