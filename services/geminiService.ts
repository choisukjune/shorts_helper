import { GoogleGenAI, Type, Modality } from "@google/genai";
import { YoutubeMeta, Scene } from '../types';

const cleanJsonString = (jsonStr: string): string => {
    // Look for a markdown code block, and if it exists, extract the content.
    const match = jsonStr.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
        return match[1];
    }
    // Fallback for cases where the markdown block is missing.
    return (jsonStr ?? '').trim();
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
        const secondaryLang = 'Japanese';

        const schema = {
            type: Type.OBJECT,
            properties: {
                english_title: { type: Type.STRING, description: 'A catchy, viral YouTube Shorts title in English (max 60 characters).' },
                english_description: { type: Type.STRING, description: 'A brief, engaging YouTube Shorts description in English.' },
                japanese_title: { type: Type.STRING, description: `A catchy, viral YouTube Shorts title in ${secondaryLang} (max 60 characters).` },
                japanese_description: { type: Type.STRING, description: `A brief, engaging YouTube Shorts description in ${secondaryLang}.` },
                tags: { type: Type.STRING, description: 'A single string of 3-5 relevant hashtags, each starting with # and separated by spaces. e.g., #volleyball #sports #shorts' },
            },
            required: ['english_title', 'english_description', 'japanese_title', 'japanese_description', 'tags']
        };
        const contents = `Generate a catchy, viral YouTube Shorts title, a brief engaging description, and relevant hashtags for the following video concept. Provide versions in both English and ${secondaryLang}. The video is intense, brutal, and cinematic.

        Video Concept: "${videoConcept}"`;

        const response = await ai.models.generateContent({
            model,
            contents,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        
        const jsonStr = cleanJsonString(response.text);
        if (!jsonStr) throw new Error("AI returned an empty response.");
        const parsed = JSON.parse(jsonStr);

        const result: YoutubeMeta = {
            en: { title: parsed.english_title, description: parsed.english_description },
            jp: { title: parsed.japanese_title, description: parsed.japanese_description },
            tags: parsed.tags,
        };

        return result;

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
2.  **Video Prompt:** Based on the image prompt you just created, devise a dynamic and interesting video prompt. Imagine a fun or surprising situation that could happen in this scene and describe it. Make it engaging for a short video format.

Also provide a "full_concept" string that summarizes this initial scene, which can be used for creating YouTube metadata.

Return the result as a single JSON object.`
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            image_prompt: { type: Type.STRING, description: 'The detailed prompt for AI image generation for the scene.' },
            video_prompt: { type: Type.STRING, description: 'The dynamic and fun video prompt based on the image prompt.' },
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

    const jsonStr = cleanJsonString(response.text);
    if (!jsonStr) throw new Error("AI returned an empty response.");
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

export const generatePromptsFromImageV2 = async (base64ImageData: string): Promise<{scene: Scene, fullConcept: string}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    const imagePart = {
        inlineData: { mimeType: 'image/jpeg', data: base64ImageData },
    };

    const textPart = {
        text: `제공된 이미지를 분석하세요. 이 이미지는 이야기의 첫 장면을 나타냅니다.

세 가지 별개의 결과물을 생성하세요:
1.  **image_prompt**: AI 이미지 생성기가 이 장면을 매우 사실적으로 재현할 수 있도록 상세한 프롬프트를 만드세요. 사용자가 제공한 예시의 구조와 구성을 따르세요. 최종 프롬프트는 반드시 "An ultra-realistic vertical 9:16 medium shot..."으로 시작해야 하며 다음의 엄격한 규칙을 포함해야 합니다:
    *   **프레이밍:** 주요 피사체는 **중앙에 위치하고 9:16 프레임의 대부분을 채워야 하며**, 대략 **머리부터 무릎까지** 촬영되어야 합니다.
    *   **피사체 설명:** 먼저, 이미지에 묘사된 **스포츠 종목을 식별**하세요. 그런 다음, 이미지에 기반하여 피사체의 외모, 표정, 자세를 상세히 묘사하세요. 운동선수는 땀에 흠뻑 젖어 있어야 합니다. 손의 모양부터 발끝까지, 예를 들어 신발을 신고 있지 않다면 맨발인 상태까지 완벽하게 묘사해야 합니다. **결정적으로, 식별된 스포츠 종목에 맞는 매우 사실적인 유니폼을 묘사해야 합니다. 유니폼은 투피스 스타일이어야 하며, 소재의 질감(예: 신축성 있는 스판덱스, 통기성 있는 메쉬), 몸에 꼭 맞는 핏, 땀으로 인한 미묘한 주름이나 빛 반사와 같은 현실적인 디테일을 강조해야 합니다. 단순히 '유니폼'이라고 하지 말고, 소재와 디자인의 사실적인 측면을 설명하여 진짜 선수복처럼 보이게 만드세요.**
    *   **배경:** 배경은 **부드럽게 흐려져야 합니다**. 특정 이미지에 맞게 수정된 "The background is softly blurred, showing a realistic track environment with sports photographers and media crew holding telephoto lenses and press badges."와 유사한 설명을 반드시 포함해야 합니다.
    *   **키워드:** 최종적으로 조합된 프롬프트의 끝에 "The scene feels authentic and dynamic, captured in 8K cinematic sports photography style, with natural lighting, perfect composition, and the athlete filling the 9:16 frame."과 같은 강력한 키워드를 추가하세요.
2.  **video_prompts**: 정확히 두 개의 문자열로 이루어진 배열. 각 문자열은 새롭게 생성된 이미지 프롬프트를 기반으로 발생하거나 발생할 수 있는 다른 잠재적 행동을 묘사하는, AI 비디오 생성기를 위한 매우 상세하고 역동적인 프롬프트여야 합니다. 각 비디오 프롬프트는 영화적이고 몰입감 있는 느낌을 주기 위해 카메라 앵글, 분위기, 캐릭터/객체 움직임, 조명, 사운드에 대한 구체적인 내용을 포함해야 합니다.
3.  **full_concept**: 이 초기 장면을 요약하는 문자열로, YouTube 메타데이터 생성에 사용될 수 있습니다.

**비디오 프롬프트 상세 수준 참고 자료:** 생성할 두 비디오 프롬프트 각각에 필요한 상세 수준의 지침으로 다음 예시를 사용하세요. 복사하지 말고, 설명의 풍부함을 일치시키세요:
---
"Dynamic, chaotic scene on the wet, slippery deck of a medium-sized fishing boat. Fishermen in navy waterproof suits scramble around a colossal, glowing deep-sea creature, a monstrous Tripod Fish. Some men are trying to secure the twitching beast with thick, heavy ropes, pulling and straining. Another fisherman slips on the wet deck and falls, quickly scrambling back up. The crew members shout wordlessly at each other, pointing and gesturing urgently as the creature thrashes, spraying water everywhere. The camera work is energetic and immersive, using a handheld style that follows the most intense action. It starts with a low-angle shot, making the creature seem immense, then whip-pans to a fisherman's face, filled with a mix of terror and exhilaration. There are quick cuts between the struggling men, the straining ropes, and extreme close-ups of the creature's alien-like eye or twitching tentacle. A large wave crashes over the side of the boat, drenching everyone and causing the camera to jerk wildly. The scene is lit by the boat's harsh deck lights against a dark, stormy sky, creating dramatic shadows. No spoken dialogue, only the sounds of the raging storm, crashing waves, the creaking boat, straining ropes, and the panicked, non-verbal shouts of the crew. Shot in ultra-realistic 8K with a gritty, documentary feel."
---
결과를 단일 JSON 객체로 반환하세요.`
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            image_prompt: { type: Type.STRING, description: 'The detailed prompt for AI image generation for the scene.' },
            video_prompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'An array of two dynamic prompts for AI video generation.'
            },
            full_concept: {
                type: Type.STRING,
                description: "A summary of this initial scene."
            }
        },
        required: ['image_prompt', 'video_prompts', 'full_concept'],
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: { responseMimeType: 'application/json', responseSchema: schema },
    });

    const jsonStr = cleanJsonString(response.text);
    if (!jsonStr) throw new Error("AI returned an empty response.");
    const parsed = JSON.parse(jsonStr);

    if (!parsed.image_prompt || !parsed.video_prompts || parsed.video_prompts.length !== 2 || !parsed.full_concept) {
        throw new Error("AI did not return the expected scene data for V2.");
    }
    
    const scene: Scene = {
        imagePrompt: parsed.image_prompt,
        videoPrompts: parsed.video_prompts,
    };

    return {
        scene,
        fullConcept: parsed.full_concept,
    };
};

export const generateRandomizedContent = async (
    tab: string,
    creatureOptions?: string[],
    preset?: 'land' | 'sea'
): Promise<{ animal1: string; animal2: string; animal3: string; background: string; pose?: string; }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';
    let prompt = '';
    const schema: any = {
        type: Type.OBJECT,
        properties: {
            animal1: { type: Type.STRING },
            animal2: { type: Type.STRING },
            animal3: { type: Type.STRING },
            background: { type: Type.STRING },
        },
        required: ['animal1', 'background']
    };

    if (tab === 'celebration') {
        prompt = 'Generate a random large, powerful land animal and a natural background for it (e.g., forest, savanna).';
    } else if (tab === 'faceoff') {
        if (preset === 'sea') {
            prompt = 'Generate two different random large, powerful sea predators and a natural underwater background for a fight (e.g., coral reef, open ocean).';
        } else {
            prompt = 'Generate two different random large, powerful land animals and a natural background for a fight (e.g., jungle, tundra).';
        }
        schema.required.push('animal2');
    } else if (tab === 'friendship') {
        if (preset === 'sea') {
            prompt = 'Generate two different, unlikely sea animal friends and a peaceful underwater background (e.g., tranquil lagoon, sunlit kelp forest).';
        } else {
            prompt = 'Generate two different, unlikely land animal friends and a peaceful, natural background for them (e.g., sunny meadow, quiet riverbank).';
        }
        schema.required.push('animal2');
    } else if (tab === 'selfie') {
        prompt = 'Generate three different, interesting animals that might take a selfie together, and a plausible background for them (e.g., park, zoo).';
        schema.required.push('animal2', 'animal3');
    } else if (tab === 'deepsea') {
        prompt = `Generate a random, terrifying or bizarre deep-sea creature that could be caught by fishermen, and a plausible setting on a boat deck. The creature should not be from this list: ${creatureOptions?.join(', ')}.`;
    } else if (tab === 'fishing') {
        prompt = `Generate a random, impressive 'trophy' fish (e.g., "Massive Blue Marlin", "Giant Tuna", "Goliath Grouper") and a visually interesting background for fishing from a small boat (e.g., "Misty lake at dawn", "Choppy coastal waters near rocky cliffs"). Return the fish as 'animal1' and the location as 'background'.`;
        schema.required = ['animal1', 'background'];
    } else if (tab === 'volleyball') {
        prompt = `Generate a short, natural pose or action for a female volleyball player, suitable for a sports news photo. Focus on moments before or after a game, not active play. Examples: 'giving a post-game interview', 'stretching on the sidelines', 'waving to fans'. The description should be 2-5 words. Just return the action description.`;
        schema.properties = { pose: { type: Type.STRING } };
        schema.required = ['pose'];
    } else if (tab === 'swimming') {
        prompt = `Generate a short, natural pose or action for a female swimmer, suitable for a sports news photo. Focus on moments outside the race itself. Examples: 'being interviewed by the pool', 'stretching on the starting block', 'celebrating a win'. The description should be 2-5 words. Just return the action description.`;
        schema.properties = { pose: { type: Type.STRING } };
        schema.required = ['pose'];
    } else if (tab === 'track') {
        prompt = `Generate a short, natural pose or action for a female track and field athlete, suitable for a sports news photo. Focus on moments outside the race itself. Examples: 'being interviewed at the finish line', 'stretching before a race', 'receiving a medal'. The description should be 2-5 words. Just return the action description.`;
        schema.properties = { pose: { type: Type.STRING } };
        schema.required = ['pose'];
    }


    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    
    const jsonStr = cleanJsonString(response.text);
    if (!jsonStr) throw new Error("AI returned an empty response.");
    const parsed = JSON.parse(jsonStr);

    return {
        animal1: parsed.animal1 || '',
        animal2: parsed.animal2 || '',
        animal3: parsed.animal3 || '',
        background: parsed.background || '',
        pose: parsed.pose || '',
    };
};

export const generateNextScene = async (
    previousImageBase64: string,
    previousImagePrompt: string
): Promise<{ newImageBase64: string; newImagePrompt: string; newVideoPrompt: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash-image';
    
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: previousImageBase64 } };
    const textPart = { text: `This image is a frame from a story. The prompt that created it was: "${previousImagePrompt}".
    
    Your task is to generate the VERY NEXT logical frame of this story.
    
    1.  First, describe what happens next in a new, detailed image prompt. The new prompt must logically follow the previous scene and maintain character/style consistency. End the prompt with "ultra real photo".
    2.  Then, generate a new video prompt that describes the action of this new scene.
    3.  Finally, use the image generation capabilities of this model to create the new image itself based on the new image prompt you just wrote.
    
    Return the new image prompt and new video prompt in the text part of your response, formatted as a JSON object, and the generated image in the image part.` };

    const schema = {
        type: Type.OBJECT,
        properties: {
            new_image_prompt: { type: Type.STRING },
            new_video_prompt: { type: Type.STRING },
        },
        required: ['new_image_prompt', 'new_video_prompt']
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            responseModalities: [Modality.IMAGE],
        },
    });

    const jsonStr = cleanJsonString(response.text);
    if (!jsonStr) throw new Error("AI returned an empty response.");
    const parsed = JSON.parse(jsonStr);
    
    let newImageBase64 = '';
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            newImageBase64 = part.inlineData.data;
            break;
        }
    }

    if (!newImageBase64 || !parsed.new_image_prompt || !parsed.new_video_prompt) {
        throw new Error("Failed to generate complete next scene data.");
    }

    return {
        newImageBase64,
        newImagePrompt: parsed.new_image_prompt,
        newVideoPrompt: parsed.new_video_prompt,
    };
};

export const generateNextSceneFromUploadedImage = async (
    uploadedImageBase64: string,
    previousImagePrompt: string
): Promise<{ newImageBase64: string; newImagePrompt: string; newVideoPrompt: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash-image';
    
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: uploadedImageBase64 } };
    const textPart = { text: `This uploaded image is the next scene in a story. The prompt for the *previous* scene was: "${previousImagePrompt}".
    
    Your task is to analyze the uploaded image and do the following:
    
    1.  Write a new, detailed image prompt that accurately describes this uploaded image. This prompt should maintain stylistic consistency with the previous prompt's intent. End the prompt with "ultra real photo".
    2.  Write a new video prompt that describes the action happening in this uploaded image.
    
    Return the new image prompt and new video prompt as a JSON object.` };
    
     const schema = {
        type: Type.OBJECT,
        properties: {
            new_image_prompt: { type: Type.STRING },
            new_video_prompt: { type: Type.STRING },
        },
        required: ['new_image_prompt', 'new_video_prompt']
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
         config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    const jsonStr = cleanJsonString(response.text);
    if (!jsonStr) throw new Error("AI returned an empty response.");
    const parsed = JSON.parse(jsonStr);

    if (!parsed.new_image_prompt || !parsed.new_video_prompt) {
        throw new Error("Failed to generate prompts for the uploaded image.");
    }

    return {
        newImageBase64: uploadedImageBase64, // Return the same uploaded image
        newImagePrompt: parsed.new_image_prompt,
        newVideoPrompt: parsed.new_video_prompt,
    };
};

export const generateVideoStartFrames = async (base64ImageData: string, videoPrompts: string[]): Promise<{ prompt: string; imageBase64: string; }[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash-image';
    
    const framePromises = videoPrompts.map((videoPrompt, i) => {
        const imagePart = {
            inlineData: { mimeType: 'image/jpeg', data: base64ImageData },
        };

        const textPart = {
            text: `Based on the attached reference image, create a new, distinct image that acts as the starting frame for a video.
            
            This is image ${i + 1} of ${videoPrompts.length}. Ensure it is visually different from any other images you might generate for this set.
            
            The video's concept is: "${videoPrompt}"
            
            Key requirements:
            - Maintain the character, style, and atmosphere of the reference image.
            - The generated image must depict the very beginning of the action described in the video concept.
            - IMPORTANT: Ensure all characters/people in the frame are fully visible and not awkwardly cropped or cut off at the edges of the image.
            
            Generate the image based on these instructions.`
        };
        
        return ai.models.generateContent({
            model,
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        }).then(response => {
             for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return {
                        prompt: videoPrompt,
                        imageBase64: part.inlineData.data,
                    };
                }
            }
            throw new Error(`Image data not found in response for prompt ${i+1}`);
        });
    });

    const generatedFrames = await Promise.all(framePromises);
    
    if (generatedFrames.length !== videoPrompts.length) {
        throw new Error("Failed to generate all video start frames.");
    }

    return generatedFrames;
};

export const regenerateVideoStartFrame = async (
    base64ImageData: string, 
    videoPrompt: string, 
    imageIndex: number
): Promise<{ prompt: string; imageBase64: string; }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash-image';
    
    const imagePart = {
        inlineData: { mimeType: 'image/jpeg', data: base64ImageData },
    };

    const textPart = {
        text: `Based on the attached reference image, regenerate a new, unique image to act as the starting frame for a video. This is a regeneration request for image ${imageIndex + 1}. Create a different result than any previous attempt.
        
        The video's concept is: "${videoPrompt}"
        
        Key requirements:
        - Maintain the character, style, and atmosphere of the reference image.
        - The generated image must depict the very beginning of the action described in the video concept.
        - IMPORTANT: Ensure all characters/people in the frame are fully visible and not awkwardly cropped or cut off at the edges of the image.
        
        Generate a new image based on these instructions.`
    };
    
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: { responseModalities: [Modality.IMAGE] },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return {
                prompt: videoPrompt,
                imageBase64: part.inlineData.data,
            };
        }
    }
    
    throw new Error(`Failed to regenerate video start frame for prompt: ${videoPrompt}`);
};

export const generateImageVariations = async (imagePrompt: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash-image';
    
    const imagePromises = Array(4).fill(0).map(() => {
        return ai.models.generateContent({
            model,
            contents: { parts: [{ text: imagePrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        }).then(response => {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
            throw new Error('Image data not found in response for variation.');
        });
    });

    const base64Images = await Promise.all(imagePromises);
    return base64Images.filter(Boolean); // Filter out any potential empty results
};

export const generateVideoPromptForImage = async (base64ImageData: string, imagePrompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    const imagePart = {
        inlineData: { mimeType: 'image/jpeg', data: base64ImageData },
    };
    const textPart = {
        text: `Analyze this image, which was created from the prompt: "${imagePrompt}".

Now, create one detailed, cinematic video prompt describing a natural and believable movement or action that would logically follow this exact scene. Focus on subtle movements, environmental effects, and camera work (like slow zooms, pans, or handheld shake). The prompt should be suitable for an AI video generator.

Return the result as a single JSON object.`
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            video_prompt: { type: Type.STRING },
        },
        required: ['video_prompt']
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    const jsonStr = cleanJsonString(response.text);
    if (!jsonStr) throw new Error("AI returned an empty response.");
    const parsed = JSON.parse(jsonStr);

    if (!parsed.video_prompt) {
        throw new Error("Failed to generate video prompt for the image.");
    }
    
    return parsed.video_prompt;
};

export const generateDetailedImagePrompt = async (concept: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-flash';

        const schema = {
            type: Type.OBJECT,
            properties: {
                detailed_prompt: { 
                    type: Type.STRING, 
                    description: 'The final, detailed image prompt as a single paragraph.' 
                },
            },
            required: ['detailed_prompt']
        };
        const contents = `Expand the following simple concept into a rich, detailed, and photorealistic image prompt suitable for an advanced AI image generator. The prompt should be a single paragraph. Elaborate on the subject, the environment, the mood, the lighting, and specific visual details. Conclude the prompt with a string of relevant, high-impact keywords for achieving realism and high quality.

Concept: "${concept}"`;

        const response = await ai.models.generateContent({
            model,
            contents,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        
        const jsonStr = cleanJsonString(response.text);
        if (!jsonStr) throw new Error("AI returned an empty response.");
        const parsed = JSON.parse(jsonStr);

        if (!parsed.detailed_prompt) {
            throw new Error("Failed to generate a detailed prompt.");
        }
        
        return parsed.detailed_prompt;
    } catch (e) {
        console.error("Failed to generate detailed prompt:", e);
        throw new Error("Failed to generate a detailed image prompt.");
    }
}