import React, { useState, useCallback } from 'react';
import { CopyIcon, CheckIcon } from './icons';

interface PromptCardProps {
  prompt: string;
}

const PromptCard: React.FC<PromptCardProps> = ({ prompt }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [prompt]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10">
      <p className="text-gray-300 leading-relaxed">{prompt}</p>
      <div className="self-end flex items-center">
        <button
          onClick={handleCopy}
          aria-label="Copy prompt to clipboard"
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {copied ? (
            <>
              <CheckIcon className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon className="h-4 w-4" />
              Copy Prompt
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PromptCard;