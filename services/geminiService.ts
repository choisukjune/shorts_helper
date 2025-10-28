
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { YoutubeMeta, Scene } from '../types';

const cleanJsonString = (jsonStr: string): string => {
    // Look for a markdown code block, and if it exists, extract the content.
    const match = jsonStr.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
        return match[1];
    }
    // Fallback for cases where the markdown block is missing.
    return jsonStr;
}

// FIX: Add missing utility function 'extractVideoId'.
export const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  // This regex handles:
  // - youtube.com/watch?v=...
  // - youtu.be/...
  // - youtube.com/shorts/...
  // - youtube.com/embed/...
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/ ]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// FIX: Add missing utility function 'imageUrlToBase64'.
export const imageUrlToBase64 = async (url: string): Promise<string> => {
    // This function will fetch an image from a URL and convert it to a base64 string.
    // NOTE: This can be blocked by CORS policy if the server doesn't allow cross-origin requests.
    // A server-side proxy would be a more robust solution in a production environment.
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // result is a data URL like "data:image/jpeg;base64,LzlqLzRB..."
            // We only want the part after the comma.
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

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
        throw new Error("Failed to generate YouTube metadata.");
    }
}

export const generatePromptsFromImage = async (base64ImageData: string): Promise<{scene: Scene, fullConcept: string}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64ImageData,
        },
    };

    const textPart = {
        text: `Analyze the provided image from a YouTube Short. This image represents the first scene of a story.

Create two distinct prompts for this single scene:
1.  **Image Prompt:** A detailed prompt for an AI image generator to recreate this scene ultra-realistically. It should be descriptive and evocative. End with "ultra real photo".
2.  **Video Prompt:** A dynamic prompt for an AI video generator describing the action that is happening or is about to happen in this scene.

Also provide a "full_concept" string that summarizes this initial scene, which can be used for creating YouTube metadata.

Return the result as a single JSON object.`
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            image_prompt: { type: Type.STRING, description: 'The detailed prompt for AI image generation for the scene.' },
            video_prompt: { type: Type.STRING, description: 'The dynamic prompt for AI video generation for the scene.' },
            full_concept: {
                type: Type.STRING,
                description: "A summary of this initial scene."
            }
        },
        required: ['image_prompt', 'video_prompt', 'full_concept'],
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: { responseMimeType: 'application/json', responseSchema: schema },
    });

    const jsonStr = cleanJsonString(response.text.trim());
    const parsed = JSON.parse(jsonStr);

    if (!parsed.image_prompt || !parsed.video_prompt || !parsed.full_concept) {
        throw new Error("AI did not return the expected scene data.");
    }
    
    const scene: Scene = {
        imagePrompt: parsed.image_prompt,
        videoPrompt: parsed.video_prompt,
    };

    return {
        scene,
        fullConcept: parsed.full_concept,
    };
};

export const generateNextScene = async (previousImageBase64: string, previousImagePrompt: string): Promise<{ newImageBase64: string; newImagePrompt: string; newVideoPrompt: string; }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // --- Step 1: Generate the next image based on the previous one ---
    const imageGenerationModel = 'gemini-2.5-flash-image';
    const imagePart = {
        inlineData: {
            data: previousImageBase64,
            mimeType: 'image/jpeg',
        },
    };
    const imageGenTextPart = {
        text: `Based on the provided image, which is described as "${previousImagePrompt}", generate a new image that shows the very next logical event. The new image must continue the story from the previous one.`,
    };

    const imageResponse = await ai.models.generateContent({
        model: imageGenerationModel,
        contents: { parts: [imagePart, imageGenTextPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    let newImageBase64 = '';
    if (imageResponse.candidates && imageResponse.candidates.length > 0) {
        for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                newImageBase64 = part.inlineData.data;
                break;
            }
        }
    }

    if (!newImageBase64) {
        throw new Error("AI did not return an image for the next scene.");
    }

    // --- Step 2: Generate prompts for the newly generated image ---
    const promptGenerationModel = 'gemini-2.5-flash';
    const newImagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: newImageBase64,
        },
    };
    const promptGenTextPart = {
        text: `Analyze the provided image, which is the next scene in a continuing story.

        Your task is to create two distinct prompts for this new scene:
        1.  **image_prompt:** A detailed, descriptive prompt for an AI image generator to recreate this exact scene. It must be ultra-realistic and end with the phrase "ultra real photo".
        2.  **video_prompt:** A dynamic prompt for an AI video generator describing the action that is happening or about to happen in this new scene, continuing the story logically.

        Return the result as a single JSON object with these two keys.`,
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            image_prompt: { type: Type.STRING, description: 'A detailed prompt for AI image generation to recreate the provided scene. Must end with "ultra real photo".' },
            video_prompt: { type: Type.STRING, description: 'A dynamic prompt for AI video generation describing the action in the scene.' },
        },
        required: ['image_prompt', 'video_prompt'],
    };

    const promptResponse = await ai.models.generateContent({
        model: promptGenerationModel,
        contents: { parts: [newImagePart, promptGenTextPart] },
        config: { responseMimeType: 'application/json', responseSchema: schema },
    });
    
    const jsonStr = cleanJsonString(promptResponse.text.trim());
    const parsed = JSON.parse(jsonStr);

    if (!parsed.image_prompt || !parsed.video_prompt) {
        throw new Error("AI did not return prompts for the next scene.");
    }

    return {
        newImageBase64,
        newImagePrompt: parsed.image_prompt,
        newVideoPrompt: parsed.video_prompt,
    };
};

export const generateNextSceneFromUploadedImage = async (
    uploadedImageBase64: string,
    previousImagePrompt: string
): Promise<{ newImageBase64: string; newImagePrompt: string; newVideoPrompt: string; }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // --- Step 1: Imagine the next scene ---
    const ideationModel = 'gemini-2.5-flash';
    const ideationContents = `The previous scene was described as: "${previousImagePrompt}". Based on this, describe the very next logical event or moment in the story. Be concise and descriptive. What happens immediately after?`;

    const ideationResponse = await ai.models.generateContent({
        model: ideationModel,
        contents: ideationContents,
    });
    const nextSceneDescription = ideationResponse.text;
    if (!nextSceneDescription) {
        throw new Error("AI failed to imagine the next scene.");
    }

    // --- Step 2: Modify the uploaded image to show the new scene ---
    const imageModificationModel = 'gemini-2.5-flash-image';
    const imagePart = {
        inlineData: {
            data: uploadedImageBase64,
            mimeType: 'image/jpeg',
        },
    };
    const imageModTextPart = {
        text: `Take the provided image and modify it to depict a new scene. The new scene is: "${nextSceneDescription}". Change the content of the image to show this new event, but try to maintain the original image's style, lighting, and overall mood.`,
    };

    const imageResponse = await ai.models.generateContent({
        model: imageModificationModel,
        contents: { parts: [imagePart, imageModTextPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    let newImageBase64 = '';
    if (imageResponse.candidates && imageResponse.candidates.length > 0) {
        for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                newImageBase64 = part.inlineData.data;
                break;
            }
        }
    }

    if (!newImageBase64) {
        throw new Error("AI did not return a modified image for the new scene.");
    }

    // --- Step 3: Generate new prompts for the modified image ---
    const promptGenerationModel = 'gemini-2.5-flash';
    const newImagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: newImageBase64,
        },
    };
    const promptGenTextPart = {
        text: `Analyze the provided image, which represents a new scene in a story.

        Your task is to create two distinct prompts for this new scene:
        1.  **image_prompt:** A detailed, descriptive prompt for an AI image generator to recreate this exact scene. It must be ultra-realistic and end with the phrase "ultra real photo".
        2.  **video_prompt:** A dynamic prompt for an AI video generator describing the action that is happening or about to happen in this new scene, continuing the story logically.

        Return the result as a single JSON object with these two keys.`,
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            image_prompt: { type: Type.STRING, description: 'A detailed prompt for AI image generation to recreate the provided scene. Must end with "ultra real photo".' },
            video_prompt: { type: Type.STRING, description: 'A dynamic prompt for AI video generation describing the action in the scene.' },
        },
        required: ['image_prompt', 'video_prompt'],
    };

    const promptResponse = await ai.models.generateContent({
        model: promptGenerationModel,
        contents: { parts: [newImagePart, promptGenTextPart] },
        config: { responseMimeType: 'application/json', responseSchema: schema },
    });
    
    const jsonStr = cleanJsonString(promptResponse.text.trim());
    const parsed = JSON.parse(jsonStr);

    if (!parsed.image_prompt || !parsed.video_prompt) {
        throw new Error("AI did not return prompts for the modified image.");
    }

    return {
        newImageBase64,
        newImagePrompt: parsed.image_prompt,
        newVideoPrompt: parsed.video_prompt,
    };
};

export const generateRandomizedContent = async (mode: 'celebration' | 'faceoff' | 'selfie'): Promise<{
    animal1: string;
    animal2: string;
    animal3: string;
    background: string;
}> => {
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
        contents = `Your task is to provide a creative and unique combination of a real, large, wild animal and a specific, fitting natural environment, with a very specific theme. The animal MUST be a creature that inhabits the Amazon rainforest, other jungle environments, or riverine ecosystems. It is absolutely CRITICAL to EXCLUDE all avian species (birds). Focus on mammals, reptiles, amphibians, and large fish. The suggestions should be evocative and cinematic.`;
     } else if (mode === 'selfie') {
        schema = {
            type: Type.OBJECT,
            properties: {
                selfie_taker: { type: Type.STRING, description: 'A cute or charismatic animal to take the selfie. E.g., "Quokka", "Orange Tabby Cat".' },
                friend1: { type: Type.STRING, description: 'A second, different animal to be in the selfie. Can be a surprising combination.' },
                friend2: { type: Type.STRING, description: 'A third, different animal to be in the selfie. Can be another surprising combination.' },
                background: { type: Type.STRING, description: 'A visually stunning natural or urban environment for the selfie. E.g., "Eiffel Tower at Night", "Coral Reef".' },
            },
            required: ['selfie_taker', 'friend1', 'friend2', 'background']
        };
        contents = `Your task is to provide a creative and unique combination for a funny animal selfie. Provide one animal to take the selfie, two other different animals to pose with it, and a specific, fitting environment for their picture. The combination should be surprising, wholesome, or humorous. The suggestions should be dramatic, evocative, and cinematic. Avoid mythical creatures.`;
     } else { // faceoff
        schema = {
          type: Type.OBJECT,
          properties: {
            animal1: { type: Type.STRING, description: 'A real, large, and visually impressive wild animal. Be specific, for example "Siberian Tiger" or "Grizzly Bear".' },
            animal2: { type: Type.STRING, description: 'Another real, large, and visually impressive wild animal that would be a good opponent for the first. Be specific.' },
            background: { type: Type.STRING, description: 'A visually stunning and fitting natural environment for the fight, like "Snowy Mountain Pass" or "Volcanic Plain".' },
          },
          required: ['animal1', 'animal2', 'background']
        };
        contents = `Your task is to provide a creative and unique combination of two real, large, wild animals for a face-off, along with a specific, fitting natural environment for their battle. The suggestions should be dramatic, evocative, and cinematic. Avoid mythical creatures.`;
     }

    try {
        const response = await ai.models.generateContent({
            model,
            contents,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });

        const jsonStr = cleanJsonString(response.text.trim());
        const parsed = JSON.parse(jsonStr);

        if (mode === 'celebration') {
            if (!parsed.animal || !parsed.background) {
                throw new Error('AI response is missing required fields for celebration mode.');
            }
            return {
                animal1: parsed.animal,
                animal2: '',
                animal3: '',
                background: parsed.background
            };
        } else if (mode === 'selfie') {
            if (!parsed.selfie_taker || !parsed.friend1 || !parsed.friend2 || !parsed.background) {
                throw new Error('AI response is missing required fields for selfie mode.');
            }
            return {
                animal1: parsed.selfie_taker,
                animal2: parsed.friend1,
                animal3: parsed.friend2,
                background: parsed.background
            };
        } else { // faceoff
            if (!parsed.animal1 || !parsed.animal2 || !parsed.background) {
                throw new Error('AI response is missing required fields for faceoff mode.');
            }
            return {
                animal1: parsed.animal1,
                animal2: parsed.animal2,
                animal3: '',
                background: parsed.background
            };
        }
    } catch (e) {
        console.error("Failed to generate randomized content:", e);
        throw new Error("Failed to get random suggestions from the AI.");
    }
};