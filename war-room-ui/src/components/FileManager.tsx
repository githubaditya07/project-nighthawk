import React, { useState } from 'react';
import { UploadCloud, Download, FileText, Zap } from 'lucide-react';
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
    <div className="editorial-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <h3 className="text-xs font-sans font-semibold text-charcoal uppercase tracking-widest flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-powder-blue-dark" /> Ingestion &amp; File Manager
        </h3>
        <span className="text-[11px] font-mono text-mid-grey bg-beige-light px-2.5 py-0.5 rounded-full border border-border">
          Max 50 MB
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
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-powder-blue-dark bg-powder-blue-light/25'
            : 'border-light-grey hover:border-powder-blue bg-beige-light'
        }`}
      >
        <UploadCloud className="w-8 h-8 text-powder-blue-dark mx-auto mb-2.5 opacity-85" />
        <label className="cursor-pointer">
          <span className="text-xs font-sans font-semibold text-powder-blue-dark hover:underline">
            Choose a file
          </span>
          <span className="text-xs font-sans text-mid-grey"> or drag &amp; drop here</span>
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
        <p className="text-[11px] font-sans text-mid-grey/80 mt-1.5">
          Supports binary payloads, media, PDFs, or archives up to 50 MB
        </p>
      </div>

      {/* Fast Demo Ingestion Buttons */}
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onGenerateAndUpload(10)}
          disabled={isUploading}
          className="flex items-center justify-center gap-1.5 bg-powder-blue-light/30 hover:bg-powder-blue-light/55 text-powder-blue-dark border border-powder-blue-light rounded-xl py-2.5 font-sans text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5 text-powder-blue-dark" /> Upload 10MB Test
        </button>
        <button
          onClick={() => onGenerateAndUpload(50)}
          disabled={isUploading}
          className="flex items-center justify-center gap-1.5 bg-dusty-pink-light/35 hover:bg-dusty-pink-light/60 text-dusty-pink-dark border border-dusty-pink-light rounded-xl py-2.5 font-sans text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5 text-dusty-pink-dark" /> Upload 50MB Stress
        </button>
      </div>

      {/* Upload Progress Banner */}
      {isUploading && (
        <div className="mt-3.5 p-2.5 bg-powder-blue-light/25 border border-powder-blue-light rounded-xl text-center font-mono text-xs text-powder-blue-dark animate-pulse">
          Encoding RS(8,4) &amp; writing real disk shards to 12 nodes...
        </div>
      )}

      {/* Manifest Metadata */}
      {manifest && (
        <div className="mt-4 bg-beige-light rounded-xl p-4 border border-border space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-mid-grey font-sans flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-powder-blue-dark" /> Active File
            </span>
            <span className="text-charcoal font-semibold truncate max-w-[190px]">{manifest.filename}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-mid-grey font-sans">Original Size</span>
            <span className="text-dark-grey font-medium">
              {(manifest.original_size / (1024 * 1024)).toFixed(2)} MB ({manifest.original_size.toLocaleString()} B)
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-mid-grey font-sans">RS(8,4) Overhead</span>
            <span className="text-sage font-semibold">1.50x (vs 3.00x baseline)</span>
          </div>

          <div>
            <span className="text-mid-grey font-sans text-[11px] block mb-1">Original Blake3 Digest</span>
            <div className="bg-white p-2 rounded-lg text-[10px] text-powder-blue-dark break-all border border-border">
              {manifest.original_blake3}
            </div>
          </div>

          <div>
            <span className="text-mid-grey font-sans text-[11px] block mb-1">Binary Merkle Root (12 Shards)</span>
            <div className="bg-white p-2 rounded-lg text-[10px] text-dusty-pink-dark break-all border border-border">
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
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-sans text-xs font-semibold tracking-wide transition-all duration-300 ${
            canDownload
              ? 'bg-sage hover:bg-sage/90 text-white shadow-sm active:scale-95'
              : 'bg-beige-light text-mid-grey/70 cursor-not-allowed border border-border'
          }`}
        >
          <Download className="w-4 h-4" />
          {canDownload ? 'Download Recovered File (Bit-Exact)' : 'Download Standby (Reconstruct First)'}
        </button>
      </div>
    </div>
  );
};
