import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2 } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language?: string;
  title?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = 'typescript',
  title
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0d1117] text-slate-200 shadow-md my-2.5 font-mono text-xs sm:text-sm">
      {/* Code Window Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-800/80 bg-slate-900/90 select-none">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5 mr-1">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <Code2 className="w-4 h-4 text-sky-400 ml-1" />
          <span className="text-slate-300 font-medium text-xs truncate max-w-[200px] sm:max-w-xs">
            {title || `snippet.${language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : language === 'python' ? 'py' : language}`}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-950/80 text-sky-400 border border-sky-800/50 uppercase tracking-wider">
            {language}
          </span>
          <button
            onClick={handleCopy}
            id="copy-code-btn"
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs active:scale-95"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body with Line Numbers */}
      <div className="overflow-x-auto p-3 sm:p-4 text-slate-100 max-h-[460px] leading-relaxed select-text">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30">
                <td className="w-10 text-right pr-4 text-slate-600 select-none text-[11px] align-top py-0.5">
                  {idx + 1}
                </td>
                <td className="whitespace-pre font-mono text-xs sm:text-[13px] py-0.5 break-all sm:break-normal text-emerald-300/90">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
