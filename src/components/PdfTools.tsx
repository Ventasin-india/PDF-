import { useState, useRef } from 'react';
import { imageToPdf, wordToPdf, pdfToWord, mergePdfs, splitPdf } from '../lib/documentProcessing';
import { FileImage, FileText, File, Combine, SplitSquareHorizontal, Download, ArrowLeft, RefreshCw } from 'lucide-react';

type Tool = 'image-to-pdf' | 'word-to-pdf' | 'pdf-to-word' | 'merge-pdf' | 'split-pdf' | null;

export default function PdfTools() {
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFiles([]);
    setError('');
    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBack = () => {
    setActiveTool(null);
    reset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (activeTool === 'merge-pdf') {
        setFiles(prev => [...prev, ...selected]);
      } else {
        setFiles([selected[0]]);
      }
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const executeAction = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError('');
    
    try {
      let resultBlob: Blob | null = null;
      let filename = 'result.pdf';
      
      const file = files[0];
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

      if (activeTool === 'image-to-pdf') {
        resultBlob = await imageToPdf(file);
        filename = `${baseName}.pdf`;
      } else if (activeTool === 'word-to-pdf') {
        resultBlob = await wordToPdf(file);
        filename = `${baseName}.pdf`;
      } else if (activeTool === 'pdf-to-word') {
        resultBlob = await pdfToWord(file);
        filename = `${baseName}.docx`;
      } else if (activeTool === 'merge-pdf') {
        resultBlob = await mergePdfs(files);
        filename = 'merged_document.pdf';
      } else if (activeTool === 'split-pdf') {
        resultBlob = await splitPdf(file, startPage, endPage);
        filename = `${baseName}_pages_${startPage}-${endPage}.pdf`;
      }

      if (resultBlob) {
        downloadBlob(resultBlob, filename);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error processing document');
    } finally {
      setProcessing(false);
    }
  };

  if (!activeTool) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ToolCard 
          icon={<FileImage className="w-8 h-8 text-blue-600" />} 
          title="Image to PDF" 
          desc="Convert JPG/PNG images to PDF documents instantly."
          onClick={() => setActiveTool('image-to-pdf')}
        />
        <ToolCard 
          icon={<FileText className="w-8 h-8 text-indigo-600" />} 
          title="Word to PDF" 
          desc="Extract and convert Word documents into secure PDFs."
          onClick={() => setActiveTool('word-to-pdf')}
        />
        <ToolCard 
          icon={<File className="w-8 h-8 text-green-600" />} 
          title="PDF to Word" 
          desc="Extract text from PDFs into an editable Word document."
          onClick={() => setActiveTool('pdf-to-word')}
        />
        <ToolCard 
          icon={<Combine className="w-8 h-8 text-purple-600" />} 
          title="Merge PDF" 
          desc="Combine multiple PDF files into a single document."
          onClick={() => setActiveTool('merge-pdf')}
        />
        <ToolCard 
          icon={<SplitSquareHorizontal className="w-8 h-8 text-orange-600" />} 
          title="Split PDF" 
          desc="Extract specific pages from a PDF to a new file."
          onClick={() => setActiveTool('split-pdf')}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
        <button onClick={handleBack} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-gray-900 capitalize">
          {activeTool.replace(/-/g, ' ')}
        </h3>
      </div>

      <div className="space-y-6 max-w-xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Select File{activeTool === 'merge-pdf' ? 's' : ''}
          </label>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            multiple={activeTool === 'merge-pdf'}
            accept={
              activeTool === 'image-to-pdf' ? 'image/png, image/jpeg, image/jpg' :
              activeTool === 'word-to-pdf' ? '.docx' :
              '.pdf'
            }
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100
              cursor-pointer"
          />

          {files.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Selected Files</h4>
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="text-sm text-gray-900 truncate">{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {activeTool === 'split-pdf' && files.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Page</label>
              <input 
                type="number" min="1" value={startPage} onChange={e => setStartPage(Number(e.target.value))}
                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Page</label>
              <input 
                type="number" min="1" value={endPage} onChange={e => setEndPage(Number(e.target.value))}
                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border px-3 py-2"
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={executeAction}
            disabled={processing || files.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {processing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {processing ? 'Processing...' : 'Process & Download'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ icon, title, desc, onClick }: { icon: React.ReactNode, title: string, desc: string, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group flex flex-col items-center text-center h-full"
    >
      <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-indigo-50 transition-colors mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}
