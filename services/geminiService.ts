import { GoogleGenAI, Type } from "@google/genai";
import { YoutubeMeta } from '../types';

const cleanJsonString = (jsonStr: string): string => {
    const match = jsonStr.match(/```json\n([\s\S]*?)\n```/);
    return match && match[1] ? match[1] : jsonStr;
}

export const generateYoutubeMeta = async (videoConcept: string): Promise<YoutubeMeta | null> => {
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

        Video Concept: "${videoConcept}"`;

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

export const generatePromptsFromImage = async (base64ImageData: string): Promise<{imagePrompts: string[], videoPrompts: string[], videoConcept: string}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64ImageData,
        },
    };

    const textPart = {
        text: `Analyze the provided image in detail. Based on your analysis, imagine what happens *next* and create a compelling 3-scene storyline that continues from the moment in the image. This storyline should be suitable for a dramatic YouTube Short.

For each of the 3 scenes, provide two distinct prompts:
1.  **Image Prompt:** A detailed, descriptive prompt for an AI image generator to create an ultra-realistic, photorealistic image representing a key moment in that scene. Include specifics on lighting, composition, and fine details to achieve a documentary-style, 8K resolution look. The prompt should end with "ultra real photo".
2.  **Video Prompt:** A dynamic prompt for an AI video generator describing the action in that scene. Include camera movement, character actions, atmosphere, and sound design cues.

Finally, provide a concise **Overall Video Concept** that summarizes the entire 3-scene storyline. This will be used to generate a title and description.

Return the result as a single JSON object with the specified structure.`
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            scene1: {
                type: Type.OBJECT,
                properties: {
                    image_prompt: { type: Type.STRING, description: 'The image prompt for scene 1.' },
                    video_prompt: { type: Type.STRING, description: 'The video prompt for scene 1.' },
                },
                required: ['image_prompt', 'video_prompt'],
            },
            scene2: {
                type: Type.OBJECT,
                properties: {
                    image_prompt: { type: Type.STRING, description: 'The image prompt for scene 2.' },
                    video_prompt: { type: Type.STRING, description: 'The video prompt for scene 2.' },
                },
                required: ['image_prompt', 'video_prompt'],
            },
            scene3: {
                type: Type.OBJECT,
                properties: {
                    image_prompt: { type: Type.STRING, description: 'The image prompt for scene 3.' },
                    video_prompt: { type: Type.STRING, description: 'The video prompt for scene 3.' },
                },
                required: ['image_prompt', 'video_prompt'],
            },
            video_concept: {
                type: Type.STRING,
                description: 'A concise summary of the entire 3-scene video storyline.'
            },
        },
        required: ['scene1', 'scene2', 'scene3', 'video_concept'],
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: { responseMimeType: 'application/json', responseSchema: schema },
    });

    const jsonStr = cleanJsonString(response.text.trim());
    const parsed = JSON.parse(jsonStr);
    
    return {
        imagePrompts: [parsed.scene1.image_prompt, parsed.scene2.image_prompt, parsed.scene3.image_prompt],
        videoPrompts: [parsed.scene1.video_prompt, parsed.scene2.video_prompt, parsed.scene3.video_prompt],
        videoConcept: parsed.video_concept,
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
            animal: { type: Type.STRING, description: 'A real, large, and visually impressive wild animal that is not a bird. Be specific, for example "Jaguar" or "Black Caiman".' },
            background: { type: Type.STRING, description: 'A visually stunning and fitting natural environment for the animal, like "Amazon Riverbank" or "Dense Jungle Clearing".' },
          },
          required: ['animal', 'background']
        };
        contents = `Your task is to provide a creative and unique combination of a real, large, wild animal and a specific, fitting natural environment, with a very specific theme. The animal MUST be a creature that inhabits the Amazon rainforest, other jungle environments, or riverine ecosystems. It is absolutely CRITICAL to EXCLUDE all avian species (birds). Focus on mammals, reptiles, amphibians, and large fish. The suggestions must be varied and unpredictable with each request. Do not repeat suggestions. For example: 'Giant River Otter' in 'Pantanal Wetlands' or 'Black Caiman' on an 'Amazon Riverbank' or 'Tapir' in a 'Dense Jungle Clearing'. The background should be a specific location within these ecosystems.`;
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
        contents = `Your task is to create a highly creative and unique matchup between two different, large, wild animals for an epic confrontation, set in a specific and fitting natural environment. It is CRITICAL that every response is drastically different and avoids predictable pairings. Do not repeat suggestions. Steer clear of typical apex predators unless they are obscure species. Instead, focus on creating surprising and plausible confrontations between creatures from different parts of the world or ecological niches. Your goal is maximum randomization and unpredictability. For example: 'Honey Badger' vs 'Giant Anteater' in the 'Cerrado Savanna' or 'Cassowary' vs 'Komodo Dragon' on a 'Volcanic Island Shore'.`;
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