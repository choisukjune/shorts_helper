import React, { useState, useCallback } from 'react';
import { CopyIcon, CheckIcon } from './icons';

interface CopyableFieldProps {
  title?: string;
  content: string;
  copyLabel?: string;
  variant?: 'prompt' | 'meta';
  displayAsCode?: boolean;
}

const CopyableField: React.FC<CopyableFieldProps> = ({ 
  title, 
  content, 
  copyLabel = 'Copy', 
  variant = 'prompt',
  displayAsCode = false 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const baseCardClasses = "bg-gray-800 border border-gray-700 rounded-lg p-5 flex flex-col justify-between gap-4 transition-all duration-300";
  const variantClasses = variant === 'prompt'
    ? "hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10"
    : "hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10";
  
  const contentStyle = displayAsCode ? 'text-gray-300 whitespace-pre-wrap' : 'text-gray-300 leading-relaxed';

  const cardContent = (
    <div className={`${baseCardClasses} ${variantClasses}`}>
      <p className={contentStyle}>{content}</p>
      <div className="self-end flex items-center">
        <button
          onClick={handleCopy}
          aria-label={`Copy ${title || 'content'} to clipboard`}
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
              {copyLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (title) {
    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-200 mb-3">{title}</h4>
        {cardContent}
      </div>
    );
  }

  return cardContent;
};

export default CopyableField;
