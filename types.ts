export interface YoutubeMeta {
  en: { title: string; description: string; };
  hi: { title: string; description: string; };
}

export interface Scene {
    imagePrompt: string;
    videoPrompt: string;
    imageBase64?: string; // Base64 string of the image, without data URI prefix
}
