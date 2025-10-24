
import { GoogleGenAI, Type } from "@google/genai";
import { YoutubeMeta } from '../types';

const cleanJsonString = (jsonStr: string): string => {
    const match = jsonStr.match(/```json\n([\s\S]*?)\n```/);
    return match && match[1] ? match[1] : jsonStr;
}

export const generateYoutubeMeta = async (videoPrompt: string): Promise<YoutubeMeta | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-flash';
        const schema = {
            type: Type.OBJECT,
            properties: {
                english_title: { type: Type.STRING, description: 'A catchy, viral YouTube Shorts title in English (max 60 characters).' },
                english_description: { type: Type.STRING, description: 'A brief, engaging YouTube Shorts description in English, including 3-5 relevant hashtags.' },
                hindi_title: { type: Type.STRING, description: 'A catchy, viral YouTube Shorts title in Hindi (max 60 characters).' },
                hindi_description: { type: Type.STRING, description: 'A brief, engaging YouTube Shorts description in Hindi, including 3-5 relevant hashtags.' },
            },
            required: ['english_title', 'english_description', 'hindi_title', 'hindi_description']
        };
        const contents = `Generate a catchy, viral YouTube Shorts title and a brief, engaging description (including relevant hashtags) for the following video concept. Provide versions in both English and Hindi. The video is intense, brutal, and cinematic.

        Video Concept: "${videoPrompt}"`;

        const response = await ai.models.generateContent({
            model,
            contents,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        
        const jsonStr = cleanJsonString(response.text.trim());
        const parsed = JSON.parse(jsonStr);

        return {
            en: { title: parsed.english_title, description: parsed.english_description },
            hi: { title: parsed.hindi_title, description: parsed.hindi_description },
        };

    } catch (e) {
        console.error("Failed to generate YouTube meta:", e);
        // Let the caller handle the error state in the UI
        throw new Error("Failed to generate YouTube metadata.");
    }
}

export const generatePromptsFromImage = async (base64ImageData: string): Promise<{imagePrompt: string, videoPrompt: string}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64ImageData,
        },
    };

    const textPart = {
        text: `Analyze the provided image in detail. Based on the analysis, create two distinct creative prompts:
1.  **Image Prompt:** A detailed, descriptive prompt for an AI image generator to create an ultra-realistic, photorealistic image. The prompt should be based on the provided image but aim for a more cinematic and high-fidelity result. Include specifics on lighting (e.g., natural, harsh, soft), composition (e.g., wide-angle, close-up), and fine details to achieve a documentary-style, 8K resolution look. The prompt should end with "ultra real photo".
2.  **Video Prompt:** A dynamic prompt for an AI video generator. Describe a short, engaging scene inspired by the image, suitable for a YouTube Short. Include camera movement, action, and atmosphere.
Return the result as a JSON object.`
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            image_prompt: { type: Type.STRING, description: 'The detailed prompt for AI image generation.' },
            video_prompt: { type: Type.STRING, description: 'The dynamic prompt for AI video generation.' },
        },
        required: ['image_prompt', 'video_prompt'],
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: { responseMimeType: 'application/json', responseSchema: schema },
    });

    const jsonStr = cleanJsonString(response.text.trim());
    const parsed = JSON.parse(jsonStr);
    
    return {
        imagePrompt: parsed.image_prompt,
        videoPrompt: parsed.video_prompt,
    };
};

export const generateRandomizedContent = async (mode: 'celebration' | 'faceoff') => {
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     const model = 'gemini-2.5-flash';
     let schema, contents;

     if (mode === 'celebration') {
        schema = {
          type: Type.OBJECT,
          properties: {
            animal: { type: Type.STRING, description: 'A real, large, and visually impressive wild animal. Be specific, for example "Goliath Heron" or "Bactrian Camel".' },
            background: { type: Type.STRING, description: 'A visually stunning and fitting natural environment for the animal, like "Salt Flats" or "Boreal Forest".' },
          },
          required: ['animal', 'background']
        };
        contents = `Generate a pair of a real, large, and visually impressive wild animal, and a fitting natural environment for it. Avoid common choices like lions, tigers, or bears. Be specific and creative.`;
      } else { // faceoff
        schema = {
          type: Type.OBJECT,
          properties: {
            animal1: { type: Type.STRING, description: 'A real, large, and visually impressive wild animal. Be specific, for example "Goliath Heron" or "Bactrian Camel".' },
            animal2: { type: Type.STRING, description: 'A second, different real, large, and visually impressive wild animal that would be a good opponent for the first animal. Be specific and creative.' },
            background: { type: Type.STRING, description: 'A visually stunning and fitting natural environment for the two animals to fight in, like "Volcanic Plains" or "Flooded Mangrove Forest".' },
          },
          required: ['animal1', 'animal2', 'background']
        };
        contents = `Generate a pair of two different, large, and visually impressive wild animals that would make for an epic confrontation, and a fitting natural environment for their battle. Avoid common choices. Be specific and creative.`;
      }

    const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseMimeType: "application/json", responseSchema: schema, temperature: 1 },
    });
    
    const jsonStr = cleanJsonString(response.text.trim());
    const parsed = JSON.parse(jsonStr);

    return {
        newAnimal1: parsed.animal || parsed.animal1,
        newAnimal2: parsed.animal2 || '',
        newBackground: parsed.background,
    }
}

export const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/shorts\/|youtu\.be\/)([\w-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export const imageUrlToBase64 = (url: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            // This can fail due to CORS policy on the client side.
            // A server-side proxy would be a more robust solution.
            const response = await fetch(url);
            if (!response.ok) {
                // Try a CORS proxy as a fallback
                const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
                const proxyResponse = await fetch(proxyUrl);
                if (!proxyResponse.ok) {
                    throw new Error(`Failed to fetch image directly and via proxy: ${proxyResponse.statusText}`);
                }
                const blob = await proxyResponse.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    resolve(base64data.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
                return;
            }
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                resolve(base64data.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        } catch (error) {
            reject(error);
        }
    });
};