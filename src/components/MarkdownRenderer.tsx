import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 shadow-inner">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
        <span className="font-mono uppercase tracking-wider text-[11px] text-slate-400">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs sm:text-sm overflow-x-auto leading-relaxed text-slate-200 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  // Split by inline code `...` and bold **...** and italic *...*
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800/90 border border-slate-700/70 text-indigo-300 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return (
        <em key={idx} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
  });
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Split by fenced code blocks ```lang ... ```
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-sm sm:text-[15px] leading-relaxed text-slate-200">
      {segments.map((segment, index) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const lines = segment.slice(3, -3).split('\n');
          const firstLine = lines[0]?.trim() || '';
          const codeBody = lines.slice(1).join('\n');
          return <CodeBlock key={index} language={firstLine} code={codeBody} />;
        }

        const lines = segment.split('\n');
        return (
          <div key={index} className="space-y-2">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1" />;

              if (trimmed === '---') {
                return <hr key={lineIdx} className="border-slate-800 my-3" />;
              }
              if (trimmed.startsWith('#### ')) {
                return (
                  <h4 key={lineIdx} className="text-sm font-semibold text-indigo-300 pt-1">
                    {renderInlineFormatting(trimmed.slice(5))}
                  </h4>
                );
              }
              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={lineIdx} className="text-base font-semibold text-white pt-1">
                    {renderInlineFormatting(trimmed.slice(4))}
                  </h3>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h2 key={lineIdx} className="text-lg font-bold text-white pt-1">
                    {renderInlineFormatting(trimmed.slice(3))}
                  </h2>
                );
              }
              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote
                    key={lineIdx}
                    className="border-l-2 border-indigo-500/70 pl-3 py-0.5 italic text-slate-300 bg-indigo-950/20 rounded-r-lg"
                  >
                    {renderInlineFormatting(trimmed.slice(2))}
                  </blockquote>
                );
              }
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="text-indigo-400 mt-1.5 text-xs">•</span>
                    <span className="flex-1">{renderInlineFormatting(trimmed.slice(2))}</span>
                  </div>
                );
              }
              const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numberedMatch) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="text-indigo-400 font-mono text-xs mt-1 min-w-[1.25rem]">
                      {numberedMatch[1]}.
                    </span>
                    <span className="flex-1">{renderInlineFormatting(numberedMatch[2])}</span>
                  </div>
                );
              }

              return <p key={lineIdx}>{renderInlineFormatting(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};
