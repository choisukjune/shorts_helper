import React, { useState, useCallback } from 'react';
import { CopyIcon, CheckIcon } from './icons';
import { YoutubeMeta } from '../types';

interface YoutubeMetaCardProps {
  meta: YoutubeMeta;
}

const YoutubeMetaCard: React.FC<YoutubeMetaCardProps> = ({ meta }) => {
  const [copied, setCopied] = useState(false);

  const combinedMeta = `--- ENGLISH ---
Title: ${meta.en.title}
Description: ${meta.en.description}

--- HINDI ---
Title: ${meta.hi.title}
Description: ${meta.hi.description}
`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(combinedMeta.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [combinedMeta]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10">
      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{combinedMeta.trim()}</div>
      <div className="self-end flex items-center">
        <button
            onClick={handleCopy}
            aria-label="Copy all metadata to clipboard"
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
                Copy All
            </>
            )}
        </button>
      </div>
    </div>
  );
};

export default YoutubeMetaCard;