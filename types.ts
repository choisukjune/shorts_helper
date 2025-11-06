export interface YoutubeMeta {
  en: { title: string; description: string; };
  jp: { title: string; description: string; };
  tags: string;
}

export interface GeneratedImage {
    imageBase64: string;
    videoPrompt?: string;
    isGeneratingVideoPrompt?: boolean;
}

export interface Scene {
    imagePrompt: string;
    videoPrompt?: string; // Kept for existing tabs, now optional
    videoPrompts?: string[]; // For Analyze URL2
    imageBase64?: string; // For thumbnail or uploaded image
    videoStartFrames?: { prompt: string; imageBase64: string; }[]; // For Analyze URL2 start frames
    generatedImages?: GeneratedImage[];
}
