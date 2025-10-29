
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
const initialDeepSeaCreatureOptions = ['Giant Squid', 'Anglerfish', 'Vampire Squid', 'Goblin Shark', 'Colossal Squid', 'Frilled Shark', 'Blobfish', 'Dumbo Octopus'];
const initialDeepSeaBackgroundOptions = ['Deck of a medium-sized fishing boat', 'A rusty, old submarine deck', 'A modern research vessel\'s deck', 'A large, wooden pirate ship deck', 'An abandoned oil rig platform'];


type Tab = 'celebration' | 'faceoff' | 'selfie' | 'analyze' | 'deepsea';

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
  const [deepSeaCreatureOptions, setDeepSeaCreatureOptions] = useState<string[]>(initialDeepSeaCreatureOptions);
  const [deepSeaBackgroundOptions, setDeepSeaBackgroundOptions] = useState<string[]>(initialDeepSeaBackgroundOptions);

  const [animal1, setAnimal1] = useState('Grizzly Bear');
  const [animal2, setAnimal2] = useState('Tiger');
  const [animal3, setAnimal3] = useState('Rhinoceros');
  const [background, setBackground] = useState('Muddy Riverbank');
  const [shortsUrl, setShortsUrl] = useState('');
  
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // Reset inputs to defaults when tab changes to avoid confusion and bugs like bears in the sea
    switch (tab) {
      case 'celebration':
        setAnimal1('Grizzly Bear');
        setBackground('Muddy Riverbank');
        break;
      case 'faceoff':
        setAnimal1('Grizzly Bear');
        setAnimal2('Tiger');
        setBackground('Muddy Riverbank');
        break;
      case 'selfie':
        setAnimal1('Orange Tabby Cat');
        setAnimal2('Golden Retriever');
        setAnimal3('Capybara');
        setBackground('Bustling City Park');
        break;
      case 'deepsea':
        setAnimal1(initialDeepSeaCreatureOptions[0]);
        setBackground(initialDeepSeaBackgroundOptions[0]);
        break;
      case 'analyze':
        // No inputs to reset for analyze tab
        break;
    }
  };

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
With each strike, the ${getShortAnimalName(currentAnimal)}’s hide splits open, and dozens of ${randomEmergingCreature} begin emerging from inside. They come out tail-first, with their heads emerging last, facing forward as they twist and scatter across the ground.
The women continue striking in a synchronized rhythm, while the camera slowly tracks forward, capturing the intense, surreal moment in cinematic slow motion.
Natural cloudy lighting, cinematic tone, gritty realism, 8K detail, shallow depth of field, dramatic perspective.
The motion should feel immersive, as if captured by a handheld camera with subtle shake and realistic sound of axes hitting flesh.`;
  }, []);

  const createFaceoffPrompt = useCallback((currentAnimal1: string, currentAnimal2: string, currentBackground: string): string => {
      return `Epic showdown between a massive ${currentAnimal1.toLowerCase()} and a ferocious ${currentAnimal2.toLowerCase()} on a ${currentBackground.toLowerCase()}. They are locked in a fierce battle, snarling and clawing at each other. The scene is chaotic and brutal. Ultra-realistic, cinematic lighting, 8K detail, wildlife photography style, ultra real photo.`;
  }, []);

  const createSelfiePrompt = useCallback((taker: string, friend1: string, friend2: string, bg: string): string => {
      return `A funny, ultra-realistic selfie. A ${taker.toLowerCase()} is holding the camera, smiling widely. In the background, a ${friend1.toLowerCase()} and a ${friend2.toLowerCase()} are posing comically. The setting is a ${bg.toLowerCase()}. The lighting is bright and cheerful, like a smartphone flash. 8K detail, ultra real photo.`;
  }, []);

  const createDeepSeaPrompt = useCallback((creature: string, setting: string): string => {
      return `Dramatic vertical shot from the stern of a ${setting.toLowerCase()}, looking forward towards the bow. The massive head of a colossal deep-sea creature, a ${creature.toLowerCase()}, is in the foreground, its body stretching away down the center of the wet, green deck. Six fishermen in dark, wet rain gear and boots stand symmetrically on either side, framing the scene. The boat's central wooden mast rises against a bleak, overcast sky. The atmosphere is one of grim triumph after a monumental struggle. Natural, diffused daylight. Ultra-realistic, documentary photography style, sharp focus, immense detail, 8K, ultra real photo.`;
  }, []);

  const createDeepSeaVideoPrompt = useCallback((creature: string, setting: string): string => {
    return `Fishermen in navy waterproof suits stand on the wet ${setting.toLowerCase()}, cautiously surrounding a massive glowing deep-sea creature that resembles a hybrid between a ${creature} and an alien being. The creature twitches slightly, splashing water around as one fisherman steps back in shock while another records the moment on his phone. The crew exchanges nervous laughter as waves crash rhythmically against the boat. The camera begins with a steady hover from a 45-degree elevated angle, slowly panning across the glistening, wet deck, capturing the detailed marine textures and soaked ropes. It then glides closer, focusing on the fishermen’s varied reactions—shock, curiosity, and humor—zooming in on the glowing creature’s subtle movements. The ocean behind the boat emits a faint bioluminescent glow beneath an overcast sky, adding to the mysterious atmosphere. The scene includes natural sounds of the ocean waves crashing, water splashing as the creature moves, and the fishermen’s spontaneous, realistic dialogue filled with surprise and laughter. This is shot in ultra-realistic 8K quality with cinematic lighting, perfectly blending documentary authenticity and comedic tension in a photorealistic oceanic setting.`;
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    setScenes([]);
    setYoutubeMeta(null);
    setThumbnailBase64(null);

    try {
      let imagePrompt: string;
      let videoPrompt: string;
      let concept: string;
      
      if (activeTab === 'celebration') {
        imagePrompt = createCelebrationPrompt(animal1, background);
        videoPrompt = createCelebrationVideoPrompt(animal1, background);
        concept = `${animal1} celebration on a ${background}`;
      } else if (activeTab === 'faceoff') {
        imagePrompt = createFaceoffPrompt(animal1, animal2, background);
        videoPrompt = `A cinematic video of a brutal fight between a ${animal1} and a ${animal2} in a ${background}.`;
        concept = `${animal1} vs ${animal2} in a ${background}`;
      } else if (activeTab === 'selfie') {
          imagePrompt = createSelfiePrompt(animal1, animal2, animal3, background);
          videoPrompt = `A live-action video selfie of a ${animal1} with a ${animal2} and ${animal3} at ${background}.`;
          concept = `Selfie with ${animal1}, ${animal2}, and ${animal3}`;
      } else if (activeTab === 'deepsea') {
        imagePrompt = createDeepSeaPrompt(animal1, background);
        videoPrompt = createDeepSeaVideoPrompt(animal1, background);
        concept = `Giant ${animal1} captured`;
      } else {
        return;
      }

      setScenes([{ imagePrompt, videoPrompt }]);
      const meta = await generateYoutubeMeta(concept);
      setYoutubeMeta(meta);

    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = async () => {
      if (!shortsUrl) {
          setError("Please enter a YouTube Shorts URL.");
          return;
      }
      const videoId = extractVideoId(shortsUrl);
      if (!videoId) {
          setError("Invalid YouTube Shorts URL.");
          return;
      }
      
      setError(null);
      setIsAnalyzing(true);
      setScenes([]);
      setYoutubeMeta(null);
      setThumbnailBase64(null);

      try {
          const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
          const base64Data = await imageUrlToBase64(thumbnailUrl);
          setThumbnailBase64(base64Data);

          const { scene, fullConcept } = await generatePromptsFromImage(base64Data);
          setScenes([scene]);

          const meta = await generateYoutubeMeta(fullConcept);
          setYoutubeMeta(meta);

      } catch (e: any) {
          console.error(e);
          setError(e.message || "Failed to analyze the video. The thumbnail might not be accessible.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleRandomize = async () => {
    if (activeTab === 'analyze') return;
    setError(null);
    setIsRandomizing(true);
    try {
        const result = await generateRandomizedContent(
            activeTab,
            activeTab === 'deepsea' ? deepSeaCreatureOptions : undefined
        );
        setAnimal1(result.animal1);
        setAnimal2(result.animal2);
        setAnimal3(result.animal3);
        setBackground(result.background);

        if (activeTab === 'celebration' || activeTab === 'faceoff' || activeTab === 'selfie') {
          const newAnimalOptions = [...new Set([...animal1Options, result.animal1, result.animal2, result.animal3].filter(Boolean))];
          setAnimal1Options(newAnimalOptions);
          setAnimal2Options(newAnimalOptions);
          setAnimal3Options(newAnimalOptions);
          setBackgroundOptions([...new Set([...backgroundOptions, result.background])]);
        } else if (activeTab === 'deepsea') {
          setDeepSeaCreatureOptions([...new Set([...deepSeaCreatureOptions, result.animal1])]);
          setDeepSeaBackgroundOptions([...new Set([...deepSeaBackgroundOptions, result.background])]);
        }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during randomization.");
    } finally {
        setIsRandomizing(false);
    }
  };
  
  const handleSaveAll = () => {
    let content = '';
    
    if (youtubeMeta) {
        content += '--- YOUTUBE METADATA ---\n\n';
        content += `${youtubeMeta.en.title} ${youtubeMeta.ja.title}\n\n`;
        content += `${youtubeMeta.en.description}\n\n`;
        content += `${youtubeMeta.ja.description}\n\n`;
    }

    if (scenes.length > 0) {
        content += '--- SCENE PROMPTS ---\n\n';
        scenes.forEach((scene, index) => {
            content += `--- Scene ${index + 1} ---\n\n`;
            content += `Image Prompt:\n${scene.imagePrompt}\n\n`;
            content += `Video Prompt:\n${scene.videoPrompt}\n\n`;
        });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = (youtubeMeta?.en.title || 'generated_prompts').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNextScene = async (sceneIndex: number) => {
      const previousScene = scenes[sceneIndex];
      if (!previousScene || !previousScene.imageBase64) {
          setError("Previous scene's image is not available to generate the next scene.");
          return;
      }
      
      setError(null);
      setIsGeneratingNextScene(true);
      try {
          const { newImageBase64, newImagePrompt, newVideoPrompt } = await generateNextScene(previousScene.imageBase64, previousScene.imagePrompt);
          const newScene: Scene = {
              imageBase64: newImageBase64,
              imagePrompt: newImagePrompt,
              videoPrompt: newVideoPrompt,
          };
          // Insert the new scene right after the current one
          const updatedScenes = [...scenes.slice(0, sceneIndex + 1), newScene, ...scenes.slice(sceneIndex + 1)];
          setScenes(updatedScenes);

      } catch (e: any) {
          console.error(e);
          setError(e.message || "Failed to generate the next scene.");
      } finally {
          setIsGeneratingNextScene(false);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        if (!base64String) {
            setError("Could not read the uploaded image.");
            return;
        }

        const sceneIndex = scenes.length - 1; // Assuming we add after the last scene
        const previousScene = scenes[sceneIndex];
        if (!previousScene) {
          setError("Cannot upload for next scene without a previous scene.");
          return;
        }

        setError(null);
        setIsUploading(true);
        try {
            const { newImageBase64, newImagePrompt, newVideoPrompt } = await generateNextSceneFromUploadedImage(base64String, previousScene.imagePrompt);
            const newScene: Scene = {
                imageBase64: newImageBase64,
                imagePrompt: newImagePrompt,
                videoPrompt: newVideoPrompt,
            };
            setScenes(prevScenes => [...prevScenes, newScene]);
        } catch (err: any) {
            setError(err.message || "Failed to process uploaded image and generate next scene.");
        } finally {
            setIsUploading(false);
        }
    };
    reader.readAsDataURL(file);
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case 'celebration':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="animal1" className="block text-sm font-medium text-gray-400 mb-2">Animal</label>
              <select id="animal1" value={animal1} onChange={(e) => setAnimal1(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {animal1Options.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="background" className="block text-sm font-medium text-gray-400 mb-2">Background</label>
              <select id="background" value={background} onChange={(e) => setBackground(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {backgroundOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
        );
      case 'faceoff':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="animal1-faceoff" className="block text-sm font-medium text-gray-400 mb-2">Animal 1</label>
              <select id="animal1-faceoff" value={animal1} onChange={(e) => setAnimal1(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {animal1Options.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="animal2-faceoff" className="block text-sm font-medium text-gray-400 mb-2">Animal 2</label>
              <select id="animal2-faceoff" value={animal2} onChange={(e) => setAnimal2(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {animal2Options.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="background-faceoff" className="block text-sm font-medium text-gray-400 mb-2">Background</label>
              <select id="background-faceoff" value={background} onChange={(e) => setBackground(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {backgroundOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
        );
      case 'selfie':
        return (
            <div className="space-y-6">
                <div>
                    <label htmlFor="selfie-taker" className="block text-sm font-medium text-gray-400 mb-2">Selfie Taker</label>
                    <select id="selfie-taker" value={animal1} onChange={(e) => setAnimal1(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                        {animal1Options.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="friend1" className="block text-sm font-medium text-gray-400 mb-2">Friend 1</label>
                    <select id="friend1" value={animal2} onChange={(e) => setAnimal2(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                        {animal2Options.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="friend2" className="block text-sm font-medium text-gray-400 mb-2">Friend 2</label>
                    <select id="friend2" value={animal3} onChange={(e) => setAnimal3(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                        {animal3Options.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="background-selfie" className="block text-sm font-medium text-gray-400 mb-2">Background</label>
                    <select id="background-selfie" value={background} onChange={(e) => setBackground(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                        {backgroundOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>
            </div>
        );
      case 'deepsea':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="deepSeaCreature" className="block text-sm font-medium text-gray-400 mb-2">
                Creature
              </label>
              <input
                id="deepSeaCreature"
                type="text"
                value={animal1}
                onChange={(e) => setAnimal1(e.target.value)}
                placeholder="e.g., Colossal Squid"
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              />
              <div className="mt-4">
                 <p className="text-xs text-gray-500 mb-2">Suggestions:</p>
                 <div className="flex flex-wrap gap-2">
                    {deepSeaCreatureOptions.map(option => {
                      const isActive = animal1 === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setAnimal1(option)}
                          className={`px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${
                            isActive 
                              ? 'bg-indigo-600 text-white shadow-md' 
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
              </div>
            </div>
            <div>
              <label htmlFor="deepSeaBackground" className="block text-sm font-medium text-gray-400 mb-2">Setting</label>
              <select
                id="deepSeaBackground"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              >
                {deepSeaBackgroundOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        );
      case 'analyze':
          return (
              <div className="space-y-4">
                  <label htmlFor="shorts-url" className="block text-sm font-medium text-gray-400">YouTube Shorts URL</label>
                  <div className="flex gap-2">
                      <input 
                          type="text"
                          id="shorts-url"
                          value={shortsUrl}
                          onChange={(e) => setShortsUrl(e.target.value)}
                          placeholder="https://www.youtube.com/shorts/..."
                          className="flex-grow bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
                      />
                      <button 
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <LinkIcon className="h-5 w-5"/>
                          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                      </button>
                  </div>
              </div>
          );
      default:
        return null;
    }
  };

  const getTabClass = (tabName: Tab) => `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none ${activeTab === tabName ? 'bg-gray-800 text-white border-b-2 border-indigo-500' : 'bg-gray-900 text-gray-400 hover:bg-gray-700 hover:text-gray-300'}`;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
            Image Prompt Generator
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Generate creative prompts for AI image and video generation.
          </p>
        </header>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl shadow-black/20">
            <div className="border-b border-gray-700 px-4 pt-2">
                <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                <button onClick={() => handleTabChange('celebration')} className={getTabClass('celebration')}>Celebration</button>
                <button onClick={() => handleTabChange('faceoff')} className={getTabClass('faceoff')}>Face-off</button>
                <button onClick={() => handleTabChange('selfie')} className={getTabClass('selfie')}>Selfie</button>
                <button onClick={() => handleTabChange('deepsea')} className={getTabClass('deepsea')}>Deep Sea</button>
                <button onClick={() => handleTabChange('analyze')} className={getTabClass('analyze')}>Analyze URL</button>
                </nav>
            </div>

            <div className="p-6">
                {renderTabContent()}

                {activeTab !== 'analyze' && (
                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <button
                        onClick={handleGenerate}
                        disabled={isGenerating || isRandomizing}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                        >
                            <SparklesIcon className="h-5 w-5" />
                            {isGenerating ? 'Generating...' : 'Generate Prompts'}
                        </button>
                        <button
                        onClick={handleRandomize}
                        disabled={isGenerating || isRandomizing}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-gray-300 font-semibold rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        <MagicWandIcon className="h-5 w-5" />
                        {isRandomizing ? 'Randomizing...' : 'Randomize'}
                        </button>
                    </div>
                )}
            </div>
        </div>

        {error && (
            <div className="mt-8 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        {(scenes.length > 0 || youtubeMeta) && (
            <div className="mt-12 space-y-10">
                 <div className="flex justify-end">
                    <button
                        onClick={handleSaveAll}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        <DownloadIcon className="h-5 w-5"/>
                        Save All
                    </button>
                </div>

                {youtubeMeta && (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">YouTube Metadata</h3>
                        <div className="grid grid-cols-1 gap-6">
                            <CopyableField 
                                title="Title & Description" 
                                content={`${youtubeMeta.en.title} ${youtubeMeta.ja.title}\n\n${youtubeMeta.en.description}\n\n${youtubeMeta.ja.description}`} 
                                variant="meta" 
                                displayAsCode
                            />
                        </div>
                    </div>
                )}

                {thumbnailBase64 && (
                    <div className="space-y-4 text-center">
                         <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">Analyzed Thumbnail</h3>
                        <img src={`data:image/jpeg;base64,${thumbnailBase64}`} alt="YouTube Short Thumbnail" className="rounded-lg shadow-lg mx-auto border-4 border-gray-700"/>
                    </div>
                )}

                {scenes.map((scene, index) => (
                    <div key={index} className="space-y-6">
                        <h3 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">Scene {index + 1}</h3>
                        <div className="grid grid-cols-1 gap-6">
                            <CopyableField title="Image Prompt" content={scene.imagePrompt} />
                            <CopyableField title="Video Prompt" content={scene.videoPrompt} />
                        </div>
                        {scene.imageBase64 && (
                             <div className="mt-4 text-center space-y-4">
                                <img src={`data:image/jpeg;base64,${scene.imageBase64}`} alt={`Generated scene ${index + 1}`} className="rounded-lg shadow-lg mx-auto border-4 border-gray-700"/>
                                <div className="flex gap-4 justify-center">
                                    <button
                                        onClick={() => handleNextScene(index)}
                                        disabled={isGeneratingNextScene || isUploading}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <SparklesIcon className="h-5 w-5"/>
                                        {isGeneratingNextScene ? 'Generating...' : 'Generate Next Scene'}
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isGeneratingNextScene || isUploading}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <UploadIcon className="h-5 w-5"/>
                                        {isUploading ? 'Uploading...' : 'Upload Image for Next Scene'}
                                    </button>
                                </div>
                             </div>
                        )}
                    </div>
                ))}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                />
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
