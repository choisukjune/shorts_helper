
import React, { useState, useCallback, useRef } from 'react';
import { YoutubeMeta, Scene } from './types';
import { 
  generateYoutubeMeta, 
  generatePromptsFromImage, 
  extractVideoId, 
  imageUrlToBase64, 
  generateRandomizedContent,
  generateNextScene,
  generateNextSceneFromUploadedImage
} from './services/geminiService';
import CopyableField from './components/CopyableField';
import { SparklesIcon, MagicWandIcon, LinkIcon, DownloadIcon, UploadIcon } from './components/icons';

const initialAnimalOptions = ['Lion', 'Tiger', 'Grizzly Bear', 'Wolf', 'Rhinoceros', 'Elephant', 'Hippo', 'Gorilla', 'Orange Tabby Cat', 'Golden Retriever', 'Capybara', 'Red Panda', 'Fox', 'Eagle', 'Shark', 'Giant Snake', 'Enormous Turtle', 'Massive Alligator', 'Huge Wild Boar', 'Large Stag', 'Moose'];
const initialBackgroundOptions = ['African Savanna', 'Muddy Riverbank', 'Grassy Lakeshore', 'Dense Jungle', 'Rocky Mountain Pass', 'Sun-drenched Meadow', 'Boreal Forest', 'Snowy Tundra', 'Bustling City Park'];

type Tab = 'celebration' | 'faceoff' | 'selfie' | 'analyze';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('celebration');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRandomizing, setIsRandomizing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGeneratingNextScene, setIsGeneratingNextScene] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeMeta, setYoutubeMeta] = useState<YoutubeMeta | null>(null);
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [animal1Options, setAnimal1Options] = useState<string[]>(initialAnimalOptions);
  const [animal2Options, setAnimal2Options] = useState<string[]>(initialAnimalOptions);
  const [animal3Options, setAnimal3Options] = useState<string[]>(initialAnimalOptions);
  const [backgroundOptions, setBackgroundOptions] = useState<string[]>(initialBackgroundOptions);

  const [animal1, setAnimal1] = useState('Grizzly Bear');
  const [animal2, setAnimal2] = useState('Tiger');
  const [animal3, setAnimal3] = useState('Rhinoceros');
  const [background, setBackground] = useState('Muddy Riverbank');
  const [shortsUrl, setShortsUrl] = useState('');
  
  const getShortAnimalName = (animal: string) => {
      const words = animal.split(' ');
      return (words.length > 1 ? words.slice(1).join(' ') : words[0]).toLowerCase();
  };

  const createCelebrationPrompt = useCallback((currentAnimal: string, currentBackground: string): string => {
      return `On the muddy ground of a ${currentBackground.toLowerCase()}, a massive ${currentAnimal.toLowerCase()} lies on the ground in the center of the frame. Several elderly women stand symmetrically on both sides of the ${getShortAnimalName(currentAnimal)}, celebrating and holding red-handled axes high above their heads. The women wear patterned dresses and aprons and are barefoot. The atmosphere is joyful, as if they’ve just made an incredible catch. Ultra-realistic, cinematic lighting, 8K detail, documentary-style composition, ultra real photo.`;
  }, []);

  const createCelebrationVideoPrompt = useCallback((currentAnimal: string, currentBackground: string): string => {
    const emergingCreatures = [
      'bioluminescent frogs', 'iridescent beetles', 'tiny, jewel-toned hummingbirds', 
      'swirling golden fish', 'a cloud of silver moths', 'scuttling crabs made of obsidian', 
      'glowing butterflies', 'miniature, clockwork dragons', 'spiders weaving starlight',
      'sentient, crystalline flowers'
    ];
    const randomEmergingCreature = emergingCreatures[Math.floor(Math.random() * emergingCreatures.length)];

    return `Generate a surreal, ultra-realistic cinematic video based on the attached image.
The scene takes place in a ${currentBackground.toLowerCase()} where several elderly women in traditional long dresses and aprons stand on both sides of a ${currentAnimal.toLowerCase()} lying on the muddy ground.
They raise their axes and strike the ${getShortAnimalName(currentAnimal)}’s body several times.
With each strike, the ${getShortAnimalName(currentAnimal)}’s hide splits open, and dozens of ${randomEmergingCreature} begin emerging from inside, twisting and scattering across the ground.
The women continue striking in a synchronized rhythm, while the camera slowly tracks forward, capturing the intense, surreal moment in cinematic slow motion.
Natural cloudy lighting, cinematic tone, gritty realism, 8K detail, shallow depth of field, dramatic perspective.
The motion should feel immersive, as if captured by a handheld camera with subtle shake and realistic sound of axes hitting flesh.`;
  }, []);

  const createFaceoffPrompt = useCallback((currentAnimal1: string, currentAnimal2: string, currentBackground: string): string => {
    return `In a dramatic, wide-angle shot, a massive ${currentAnimal1.toLowerCase()} and an equally formidable ${currentAnimal2.toLowerCase()} face off in the middle of a ${currentBackground.toLowerCase()}. The atmosphere is thick with tension as they stare each other down, moments before a clash. The ${getShortAnimalName(currentAnimal1)} is poised on the left, snarling, while the ${getShortAnimalName(currentAnimal2)} stands its ground on the right, muscles tensed. The lighting is harsh and dramatic, casting long shadows. Ultra-realistic, cinematic lighting, 8K detail, documentary-style composition, ultra real photo.`;
  }, []);
  
  const createFaceoffVideoPrompt = useCallback((currentAnimal1: string, currentAnimal2: string, currentBackground: string): string => {
    return `Generate a surreal, ultra-realistic cinematic video of a fierce battle between a ${currentAnimal1.toLowerCase()} and a ${currentAnimal2.toLowerCase()} in a ${currentBackground.toLowerCase()}. The fight is brutal and primal, with the two creatures lunging, biting, and clawing at each other. The camera is dynamic, using a mix of slow-motion shots to emphasize powerful impacts and fast-paced, shaky handheld shots to convey the chaos of the fight. Debris flies, and the ground is torn up. Natural cloudy lighting, cinematic tone, gritty realism, 8K detail.`;
  }, []);

  const createSelfiePrompt = useCallback((selfieTaker: string, friend1: string, friend2: string, currentBackground: string): string => {
    // Options for randomization to make prompts more varied
    const timeOptions = ['golden hour sunset', 'bright midday', 'early morning mist', 'dusk'];
    const expressionOptions = ['proud and confident', 'playful and mischievous', 'calm and serene', 'curiously adorable', 'joyful'];
    const lightingTypeOptions = ['golden-hour lighting', 'natural daylight', 'dramatic backlighting', 'soft ambient light'];
    
    // Select random elements
    const time_of_day = timeOptions[Math.floor(Math.random() * timeOptions.length)];
    const expression_tone = expressionOptions[Math.floor(Math.random() * expressionOptions.length)];
    const lighting_type = lightingTypeOptions[Math.floor(Math.random() * lightingTypeOptions.length)];
    
    // Determine lighting description based on time of day
    let lighting_description = '';
    switch (time_of_day) {
        case 'golden hour sunset':
            lighting_description = 'the warm glow casting long, soft shadows';
            break;
        case 'bright midday':
            lighting_description = 'the clear, direct sunlight';
            break;
        case 'early morning mist':
            lighting_description = 'soft, diffused light filtering through the mist';
            break;
        case 'dusk':
            lighting_description = 'the cool, low light of twilight';
            break;
        default:
            lighting_description = 'natural, ambient light';
    }

    // Combine friends into a single string
    const secondary_animals = `a ${friend1.toLowerCase()} and a ${friend2.toLowerCase()}`;
    // Generic background elements based on the environment
    const background_elements = `the natural features of the ${currentBackground.toLowerCase()}`;
    const main_animal = selfieTaker.toLowerCase();
    const environment = currentBackground.toLowerCase();

    // Fill the template
    return `A hyper-realistic, cinematic scene of a playful ${main_animal} taking a selfie in ${environment} during ${time_of_day}.
The ${main_animal} is in the foreground, holding one paw, fin, or limb toward the camera like it’s filming a vlog or snapping a selfie, with a ${expression_tone} expression.
Behind it, ${secondary_animals} appear naturally in the background, posing or interacting with curiosity, adding a fun and friendly vibe.
The lighting captures ${lighting_description}, and the background features ${background_elements}.
The overall tone feels like a travel vlog snapshot — candid, joyful, and cinematic — emphasizing natural behavior and personality.
Ultra-detailed 8K resolution, shallow depth of field, realistic wildlife photography, balanced composition, natural ${lighting_type}, cinematic tone, documentary aesthetic, ultra real photo.`;
  }, []);

  const createSelfieVideoPrompt = useCallback((selfieTaker: string, friend1: string, friend2: string, currentBackground: string): string => {
    const selfieTakerShort = getShortAnimalName(selfieTaker);
    const friend1Short = getShortAnimalName(friend1);
    const friend2Short = getShortAnimalName(friend2);

    // Dynamic Elements for Variety
    const openings = [
      `The video begins with a shaky, handheld camera view, as if the ${selfieTaker.toLowerCase()} is adjusting the frame. It then turns the camera to its face, giving a cheerful expression.`,
      `The shot opens with a beautiful view of the ${currentBackground.toLowerCase()}. The ${selfieTaker.toLowerCase()}'s paw enters the frame, turning the camera around to reveal itself in a classic vlogger-style intro.`,
      `The video starts in selfie-mode, with the ${selfieTaker.toLowerCase()} walking through the ${currentBackground.toLowerCase()}, narrating its adventure with playful gestures.`
    ];

    const friendIntroductions = [
      `"Look who I found!" the ${selfieTakerShort} seems to gesture, as the camera pans to reveal the ${friend1.toLowerCase()} lounging nearby. The ${friend1Short} notices the camera and comes over, followed by the curious ${friend2.toLowerCase()}.`,
      `Suddenly, the ${friend1.toLowerCase()} and ${friend2.toLowerCase()} playfully photobomb the shot from behind the ${selfieTakerShort}, who reacts with mock surprise and laughter.`,
      `The ${selfieTakerShort} calls out, and a moment later, the ${friend1.toLowerCase()} and ${friend2.toLowerCase()} wander into the frame, joining the group with natural curiosity.`
    ];

    const endings = [
      `The trio gathers close for a group shot, but just as they pose, the ${friend2Short} sneezes, causing them all to burst into laughter as the video clip ends.`,
      `As they all smile for the camera, the ${friend1Short} playfully nudges the camera with its nose, causing the shot to tilt sideways and end abruptly with a fun, candid feel.`,
      `The video concludes with the ${selfieTakerShort} giving a final wave to the camera before turning it around to show the stunning sunset, ending the vlog for the day.`
    ];
    
    // Select random elements
    const opening = openings[Math.floor(Math.random() * openings.length)];
    const friendIntroduction = friendIntroductions[Math.floor(Math.random() * friendIntroductions.length)];
    const ending = endings[Math.floor(Math.random() * endings.length)];

    // Combine into a cohesive prompt
    return `Create a 15-second, ultra-realistic short video with a candid, travel vlog aesthetic.
The scene is set in the ${currentBackground.toLowerCase()} during a beautiful golden hour.
${opening}
${friendIntroduction}
${ending}
The entire video should feel authentic and unscripted, shot from the ${selfieTakerShort}'s perspective. Use natural environmental sounds, warm cinematic color grading, and a joyful, heartwarming tone.`;
  }, []);

  const handleGenerate = useCallback(async () => {
    if (isGenerating || isRandomizing || isAnalyzing) return;
    setIsGenerating(true);
    setError(null);
    setScenes([]);
    setYoutubeMeta(null);

    try {
        let newPrompt: string, newVideoPrompt: string;

        if (activeTab === 'celebration') {
            newPrompt = createCelebrationPrompt(animal1, background);
            newVideoPrompt = createCelebrationVideoPrompt(animal1, background);
        } else if (activeTab === 'selfie') {
            newPrompt = createSelfiePrompt(animal1, animal2, animal3, background);
            newVideoPrompt = createSelfieVideoPrompt(animal1, animal2, animal3, background);
        } else {
            newPrompt = createFaceoffPrompt(animal1, animal2, background);
            newVideoPrompt = createFaceoffVideoPrompt(animal1, animal2, background);
        }

        setScenes([{ imagePrompt: newPrompt, videoPrompt: newVideoPrompt }]);
        
        if (newVideoPrompt) {
            const meta = await generateYoutubeMeta(newVideoPrompt);
            setYoutubeMeta(meta);
        }
    } catch(e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Failed to generate prompts. Please try again.";
        setError(errorMessage);
    } finally {
        setIsGenerating(false);
    }
  }, [animal1, animal2, animal3, background, activeTab, isGenerating, isRandomizing, isAnalyzing, createCelebrationPrompt, createCelebrationVideoPrompt, createFaceoffPrompt, createFaceoffVideoPrompt, createSelfiePrompt, createSelfieVideoPrompt]);

  const handleRandomize = useCallback(async () => {
    if (isRandomizing || isGenerating || isAnalyzing) return;
    setIsRandomizing(true);
    setError(null);
    setScenes([]);
    setYoutubeMeta(null);

    try {
      const { animal1: newAnimal1, animal2: newAnimal2, animal3: newAnimal3, background: newBackground } = await generateRandomizedContent(activeTab);

      if (newBackground && !backgroundOptions.includes(newBackground)) {
        setBackgroundOptions(prev => [newBackground, ...prev]);
      }
      setBackground(newBackground);

      let finalPrompt: string, finalVideoPrompt: string;
      
      if (activeTab === 'celebration') {
        if (newAnimal1 && !animal1Options.includes(newAnimal1)) {
          setAnimal1Options(prev => [newAnimal1, ...prev]);
        }
        setAnimal1(newAnimal1);
        finalPrompt = createCelebrationPrompt(newAnimal1, newBackground);
        finalVideoPrompt = createCelebrationVideoPrompt(newAnimal1, newBackground);
      } else if (activeTab === 'selfie') {
        if (newAnimal1 && !animal1Options.includes(newAnimal1)) setAnimal1Options(prev => [newAnimal1, ...prev]);
        if (newAnimal2 && !animal2Options.includes(newAnimal2)) setAnimal2Options(prev => [newAnimal2, ...prev]);
        if (newAnimal3 && !animal3Options.includes(newAnimal3)) setAnimal3Options(prev => [newAnimal3, ...prev]);
        setAnimal1(newAnimal1);
        setAnimal2(newAnimal2);
        setAnimal3(newAnimal3);
        finalPrompt = createSelfiePrompt(newAnimal1, newAnimal2, newAnimal3, newBackground);
        finalVideoPrompt = createSelfieVideoPrompt(newAnimal1, newAnimal2, newAnimal3, newBackground);
      } else { // faceoff
        if (newAnimal1 && !animal1Options.includes(newAnimal1)) {
          setAnimal1Options(prev => [newAnimal1, ...prev]);
        }
        if (newAnimal2 && !animal2Options.includes(newAnimal2)) {
          setAnimal2Options(prev => [newAnimal2, ...prev]);
        }
        setAnimal1(newAnimal1);
        setAnimal2(newAnimal2);
        finalPrompt = createFaceoffPrompt(newAnimal1, newAnimal2, newBackground);
        finalVideoPrompt = createFaceoffVideoPrompt(newAnimal1, newAnimal2, newBackground);
      }

      setScenes([{ imagePrompt: finalPrompt, videoPrompt: finalVideoPrompt }]);
      
      if (finalVideoPrompt) {
          const meta = await generateYoutubeMeta(finalVideoPrompt);
          setYoutubeMeta(meta);
      }

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to get random suggestions from the AI. Please try again.";
      setError(errorMessage);
    } finally {
      setIsRandomizing(false);
    }
  }, [isRandomizing, isGenerating, isAnalyzing, activeTab, animal1Options, animal2Options, animal3Options, backgroundOptions, createCelebrationPrompt, createCelebrationVideoPrompt, createFaceoffPrompt, createFaceoffVideoPrompt, createSelfiePrompt, createSelfieVideoPrompt]);

  const handleAnalyzeShorts = useCallback(async () => {
    if (isAnalyzing || !shortsUrl) return;
    setIsAnalyzing(true);
    setError(null);
    setScenes([]);
    setYoutubeMeta(null);
    setThumbnailBase64(null);

    try {
      const videoId = extractVideoId(shortsUrl);
      if (!videoId) {
        throw new Error("Invalid YouTube Shorts URL. Please use a valid link.");
      }
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      let base64Data;
      try {
        base64Data = await imageUrlToBase64(thumbnailUrl);
      } catch (e) {
        console.error("Image fetch error:", e);
        throw new Error("Could not fetch YouTube thumbnail. This might be a CORS issue. This feature works best when run in an environment without strict cross-origin restrictions.");
      }
      
      setThumbnailBase64(base64Data);
      const { scene, fullConcept } = await generatePromptsFromImage(base64Data);
      
      setScenes([scene]);
      
      if (fullConcept) {
        const meta = await generateYoutubeMeta(fullConcept);
        setYoutubeMeta(meta);
      }

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to analyze Shorts. Please try again.";
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [shortsUrl, isAnalyzing]);

  const handleGenerateNextScene = useCallback(async () => {
    if (isGeneratingNextScene || isGenerating || isRandomizing || isAnalyzing || !scenes.length || isUploading) return;
    setIsGeneratingNextScene(true);
    setError(null);

    try {
      let lastImageBase64 = thumbnailBase64;
      for (let i = scenes.length - 1; i >= 0; i--) {
        if (scenes[i].imageBase64) {
          lastImageBase64 = scenes[i].imageBase64;
          break;
        }
      }

      if (!lastImageBase64) {
        throw new Error("Could not find a base image to generate the next scene from.");
      }

      const lastScene = scenes[scenes.length - 1];
      
      const { newImageBase64, newImagePrompt, newVideoPrompt } = await generateNextScene(lastImageBase64, lastScene.imagePrompt);

      const newScene: Scene = {
        imagePrompt: newImagePrompt,
        videoPrompt: newVideoPrompt,
        imageBase64: newImageBase64,
      };

      setScenes(prevScenes => [...prevScenes, newScene]);

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to generate the next scene. Please try again.";
      setError(errorMessage);
    } finally {
      setIsGeneratingNextScene(false);
    }
  }, [scenes, thumbnailBase64, isGeneratingNextScene, isGenerating, isRandomizing, isAnalyzing, isUploading]);

  const isLoading = isGenerating || isRandomizing || isAnalyzing;

  const handleImageUploadAndGenerateNextScene = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !scenes.length) {
      return;
    }
    const file = event.target.files[0];
    
    if (isUploading || isLoading || isGeneratingNextScene) return;
    setIsUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        if (!base64Data) {
          throw new Error("Failed to read the uploaded image.");
        }
        
        const lastScene = scenes[scenes.length - 1];
        
        const { newImageBase64, newImagePrompt, newVideoPrompt } = await generateNextSceneFromUploadedImage(base64Data, lastScene.imagePrompt);

        const newScene: Scene = {
          imagePrompt: newImagePrompt,
          videoPrompt: newVideoPrompt,
          imageBase64: newImageBase64,
        };

        setScenes(prevScenes => [...prevScenes, newScene]);
        
      } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Failed to generate the next scene from the uploaded image. Please try again.";
        setError(errorMessage);
      } finally {
        setIsUploading(false);
        if (event.target) {
            event.target.value = '';
        }
      }
    };
    reader.onerror = () => {
        setError("Error reading the selected file.");
        setIsUploading(false);
    };
    reader.readAsDataURL(file);

  }, [scenes, isUploading, isLoading, isGeneratingNextScene]);


  const handleSaveAll = useCallback(() => {
    if (scenes.length === 0 && !youtubeMeta) return;

    let content = '';
    
    scenes.forEach((scene, index) => {
        content += `--- SCENE ${index + 1} ---\n\n`;
        content += '--- IMAGE PROMPT ---\n';
        content += scene.imagePrompt;
        content += '\n\n';
        content += '--- VIDEO PROMPT ---\n';
        content += scene.videoPrompt;
        content += '\n\n';
    });

    if (youtubeMeta) {
        content += '--- YOUTUBE SHORTS META ---\n';
        content += `--- ENGLISH ---\n`;
        content += `Title: ${youtubeMeta.en.title}\n`;
        content += `Description: ${youtubeMeta.en.description}\n\n`;
        content += `--- HINDI ---\n`;
        content += `Title: ${youtubeMeta.hi.title}\n`;
        content += `Description: ${youtubeMeta.hi.description}\n`;
    }

    const sanitizeFilename = (title: string): string => {
        if (!title) return 'generated-content';
        const sanitized = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        return sanitized.slice(0, 50) || 'generated-content';
    };

    const filename = youtubeMeta?.en?.title 
        ? sanitizeFilename(youtubeMeta.en.title)
        : 'generated-content';

    const blob = new Blob([content.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scenes, youtubeMeta]);

  const TabButton: React.FC<{tab: Tab, label: string}> = ({tab, label}) => (
    <button onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
        {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 md:mb-12">
          <div className="inline-block bg-gradient-to-r from-purple-500 to-indigo-600 p-3 rounded-full mb-4">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-500 text-transparent bg-clip-text">
            AI Prompt Generator
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Create imaginative prompts or analyze existing content for new ideas.
          </p>
        </header>

        <main>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-2xl shadow-indigo-500/10">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg self-center flex-wrap justify-center">
                <TabButton tab="celebration" label="Celebration" />
                <TabButton tab="faceoff" label="Face-off" />
                <TabButton tab="selfie" label="Animal Selfie" />
                <TabButton tab="analyze" label="Analyze Shorts" />
              </div>

              {activeTab === 'celebration' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="animal-select" className="block text-sm font-medium text-gray-300 mb-2">Animal</label>
                    <select id="animal-select" value={animal1} onChange={e => setAnimal1(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300">
                      {animal1Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="background-select" className="block text-sm font-medium text-gray-300 mb-2">Background</label>
                    <select id="background-select" value={background} onChange={e => setBackground(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300">
                      {backgroundOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'faceoff' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="animal1-select" className="block text-sm font-medium text-gray-300 mb-2">Animal 1</label>
                    <select id="animal1-select" value={animal1} onChange={e => setAnimal1(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300">
                      {animal1Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                   <div>
                    <label htmlFor="animal2-select" className="block text-sm font-medium text-gray-300 mb-2">Animal 2</label>
                    <select id="animal2-select" value={animal2} onChange={e => setAnimal2(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300">
                      {animal2Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="background-select" className="block text-sm font-medium text-gray-300 mb-2">Background</label>
                    <select id="background-select" value={background} onChange={e => setBackground(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300">
                      {backgroundOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              )}
              
              {activeTab === 'selfie' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="selfie-taker-select" className="block text-sm font-medium text-gray-300 mb-2">Selfie Taker</label>
                    <select id="selfie-taker-select" value={animal1} onChange={e => setAnimal1(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300">
                      {animal1Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="friend1-select" className="block text-sm font-medium text-gray-300 mb-2">Friend 1</label>
                    <select id="friend1-select" value={animal2} onChange={e => setAnimal2(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300">
                      {animal2Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="friend2-select" className="block text-sm font-medium text-gray-300 mb-2">Friend 2</label>
                    <select id="friend2-select" value={animal3} onChange={e => setAnimal3(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300">
                      {animal3Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="background-select" className="block text-sm font-medium text-gray-300 mb-2">Background</label>
                    <select id="background-select" value={background} onChange={e => setBackground(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300">
                      {backgroundOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'analyze' && (
                  <div className="flex flex-col gap-2">
                      <label htmlFor="shorts-url" className="block text-sm font-medium text-gray-300">YouTube Shorts URL</label>
                      <div className="flex gap-4 flex-col sm:flex-row">
                        <input 
                            type="url" 
                            id="shorts-url" 
                            value={shortsUrl}
                            onChange={e => setShortsUrl(e.target.value)}
                            placeholder="https://www.youtube.com/shorts/..."
                            className="flex-grow p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300"
                        />
                        <button
                          onClick={handleAnalyzeShorts}
                          disabled={isLoading || !shortsUrl}
                          className="flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500"
                        >
                          {isAnalyzing ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <LinkIcon className="h-5 w-5 mr-2" />
                              Analyze
                            </>
                          )}
                        </button>
                      </div>
                  </div>
              )}
              
              {(activeTab !== 'analyze') && (
                <div className="flex flex-col sm:flex-row sm:justify-end gap-4 mt-2">
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        Generate
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleRandomize}
                    disabled={isLoading}
                    className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
                  >
                    {isRandomizing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Randomizing...
                      </>
                    ) : (
                      <>
                        <MagicWandIcon className="h-5 w-5 mr-2" />
                        Randomize
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {error && <p className="text-red-400 text-center mt-6">{error}</p>}

          {scenes.length > 0 && (
            <div className="mt-8 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                <h2 className="text-2xl font-bold text-gray-100">Generated Content</h2>
                <button
                  onClick={handleSaveAll}
                  aria-label="Save all generated content to a file"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-300"
                >
                  <DownloadIcon className="h-5 w-5" />
                  Save All
                </button>
              </div>
              <div className="space-y-12 pt-6">
                {scenes.map((scene, index) => (
                  <div key={`scene-${index}`} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-2xl font-bold text-indigo-400 mb-6">Scene {index + 1}</h3>
                    
                    {scene.imageBase64 && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-200 mb-3">Generated Image</h4>
                        <img
                          src={`data:image/jpeg;base64,${scene.imageBase64}`}
                          alt={`Generated image for Scene ${index + 1}`}
                          className="rounded-lg w-full max-w-md mx-auto shadow-lg"
                        />
                      </div>
                    )}

                    <div className="space-y-6">
                      <CopyableField 
                        title="Image Prompt"
                        content={scene.imagePrompt}
                        copyLabel="Copy Prompt"
                        variant="prompt"
                      />
                      <CopyableField 
                        title="Video Prompt"
                        content={scene.videoPrompt}
                        copyLabel="Copy Prompt"
                        variant="prompt"
                      />
                    </div>
                  </div>
                ))}
                
                {youtubeMeta && (
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <h3 className="text-2xl font-bold text-purple-400 mb-6">YouTube Shorts Meta</h3>
                         <CopyableField
                            content={`--- ENGLISH ---\nTitle: ${youtubeMeta.en.title}\nDescription: ${youtubeMeta.en.description}\n\n--- HINDI ---\nTitle: ${youtubeMeta.hi.title}\nDescription: ${youtubeMeta.hi.description}`}
                            copyLabel="Copy All"
                            variant="meta"
                            displayAsCode={true}
                        />
                    </div>
                )}
              </div>

              {activeTab === 'analyze' && (
                <div className="mt-8 flex justify-center flex-wrap gap-4">
                  <button
                    onClick={handleGenerateNextScene}
                    disabled={isGeneratingNextScene || isLoading || isUploading}
                    className="flex items-center justify-center px-8 py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500"
                  >
                    {isGeneratingNextScene ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        Generate Next Scene
                      </>
                    )}
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUploadAndGenerateNextScene}
                    accept="image/png, image/jpeg"
                    className="hidden"
                    disabled={isGeneratingNextScene || isLoading || isUploading}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGeneratingNextScene || isLoading || isUploading}
                    className="flex items-center justify-center px-8 py-4 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500"
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="h-5 w-5 mr-2" />
                        Upload &amp; Generate
                      </>
                    )}
                  </button>

                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
