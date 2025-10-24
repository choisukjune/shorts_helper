import React, { useState, useCallback } from 'react';
import { YoutubeMeta } from './types';
// FIX: Import `generateRandomizedContent` to resolve the "Cannot find name" error.
import { generateYoutubeMeta, generatePromptsFromImage, extractVideoId, imageUrlToBase64, generateRandomizedContent } from './services/geminiService';
import PromptCard from './components/PromptCard';
import YoutubeMetaCard from './components/YoutubeMetaCard';
import { SparklesIcon, MagicWandIcon, LinkIcon, SaveIcon } from './components/icons';

const initialAnimalOptions = ['Giant Snake', 'Enormous Turtle', 'Massive Alligator', 'Huge Wild Boar', 'Large Stag', 'Grizzly Bear', 'Moose'];
const initialBackgroundOptions = ['Muddy Riverbank', 'Grassy Lakeshore', 'Dense Jungle', 'Rocky Mountain Pass', 'Sun-drenched Meadow', 'Boreal Forest'];

type Tab = 'celebration' | 'faceoff' | 'analyze';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('celebration');
  const [imagePrompts, setImagePrompts] = useState<string[]>([]);
  const [videoPrompts, setVideoPrompts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRandomizing, setIsRandomizing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeMeta, setYoutubeMeta] = useState<YoutubeMeta | null>(null);

  const [animal1Options, setAnimal1Options] = useState<string[]>(initialAnimalOptions);
  const [animal2Options, setAnimal2Options] = useState<string[]>(initialAnimalOptions);
  const [backgroundOptions, setBackgroundOptions] = useState<string[]>(initialBackgroundOptions);

  const [animal1, setAnimal1] = useState(animal1Options[0]);
  const [animal2, setAnimal2] = useState(animal2Options[1]);
  const [background, setBackground] = useState(backgroundOptions[0]);
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

  const handleGenerate = useCallback(async () => {
    if (isGenerating || isRandomizing || isAnalyzing) return;
    setIsGenerating(true);
    setError(null);
    setImagePrompts([]);
    setVideoPrompts([]);
    setYoutubeMeta(null);

    try {
        let newPrompt: string, newVideoPrompt: string;

        if (activeTab === 'celebration') {
            newPrompt = createCelebrationPrompt(animal1, background);
            newVideoPrompt = createCelebrationVideoPrompt(animal1, background);
        } else {
            newPrompt = createFaceoffPrompt(animal1, animal2, background);
            newVideoPrompt = createFaceoffVideoPrompt(animal1, animal2, background);
        }

        setImagePrompts([newPrompt]);
        setVideoPrompts([newVideoPrompt]);
        
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
  }, [animal1, animal2, background, activeTab, isGenerating, isRandomizing, isAnalyzing, createCelebrationPrompt, createCelebrationVideoPrompt, createFaceoffPrompt, createFaceoffVideoPrompt]);

  const handleRandomize = useCallback(async () => {
    if (isRandomizing || isGenerating || isAnalyzing) return;
    setIsRandomizing(true);
    setError(null);
    setImagePrompts([]);
    setVideoPrompts([]);
    setYoutubeMeta(null);

    try {
      const { newAnimal1, newAnimal2, newBackground } = await generateRandomizedContent(activeTab);

      if (!backgroundOptions.includes(newBackground)) {
        setBackgroundOptions(prev => [newBackground, ...prev]);
      }
      setBackground(newBackground);

      let finalPrompt: string, finalVideoPrompt: string;
      
      if (activeTab === 'celebration') {
        if (!animal1Options.includes(newAnimal1)) {
          setAnimal1Options(prev => [newAnimal1, ...prev]);
        }
        setAnimal1(newAnimal1);
        finalPrompt = createCelebrationPrompt(newAnimal1, newBackground);
        finalVideoPrompt = createCelebrationVideoPrompt(newAnimal1, newBackground);
      } else { // faceoff
        if (!animal1Options.includes(newAnimal1)) {
          setAnimal1Options(prev => [newAnimal1, ...prev]);
        }
        if (!animal2Options.includes(newAnimal2)) {
          setAnimal2Options(prev => [newAnimal2, ...prev]);
        }
        setAnimal1(newAnimal1);
        setAnimal2(newAnimal2);
        finalPrompt = createFaceoffPrompt(newAnimal1, newAnimal2, newBackground);
        finalVideoPrompt = createFaceoffVideoPrompt(newAnimal1, newAnimal2, newBackground);
      }

      setImagePrompts([finalPrompt]);
      setVideoPrompts([finalVideoPrompt]);
      
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
  }, [isRandomizing, isGenerating, isAnalyzing, activeTab, animal1Options, animal2Options, backgroundOptions, createCelebrationPrompt, createCelebrationVideoPrompt, createFaceoffPrompt, createFaceoffVideoPrompt]);

  const handleAnalyzeShorts = useCallback(async () => {
    if (isAnalyzing || !shortsUrl) return;
    setIsAnalyzing(true);
    setError(null);
    setImagePrompts([]);
    setVideoPrompts([]);
    setYoutubeMeta(null);

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
      
      const { imagePrompts: newImagePrompts, videoPrompts: newVideoPrompts, videoConcept } = await generatePromptsFromImage(base64Data);
      
      setImagePrompts(newImagePrompts);
      setVideoPrompts(newVideoPrompts);
      
      if (videoConcept) {
        const meta = await generateYoutubeMeta(videoConcept);
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

  const handleSaveAll = useCallback(() => {
    if (!imagePrompts.length && !videoPrompts.length && !youtubeMeta) return;

    let content = '';

    if (activeTab === 'analyze' && imagePrompts.length > 0) {
        imagePrompts.forEach((prompt, index) => {
            content += `--- SCENE ${index + 1} IMAGE PROMPT ---\n`;
            content += prompt;
            content += '\n\n';
            if (videoPrompts[index]) {
                content += `--- SCENE ${index + 1} VIDEO PROMPT ---\n`;
                content += videoPrompts[index];
                content += '\n\n';
            }
        });
    } else {
        if (imagePrompts.length > 0) {
            content += '--- GENERATED IMAGE PROMPT ---\n';
            content += imagePrompts.join('\n\n');
            content += '\n\n';
        }

        if (videoPrompts.length > 0) {
            content += '--- GENERATED VIDEO PROMPT ---\n';
            content += videoPrompts.join('\n\n');
            content += '\n\n';
        }
    }

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
        // Remove characters that are not letters, numbers, spaces, or hyphens.
        // Then, trim whitespace and replace spaces with a single hyphen.
        const sanitized = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        // Limit length to avoid issues.
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
  }, [imagePrompts, videoPrompts, youtubeMeta, activeTab]);

  const TabButton: React.FC<{tab: Tab, label: string}> = ({tab, label}) => (
    <button onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
        {label}
    </button>
  );

  const isLoading = isGenerating || isRandomizing || isAnalyzing;

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
              
              {(activeTab === 'celebration' || activeTab === 'faceoff') && (
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

          {(imagePrompts.length > 0 || videoPrompts.length > 0) && !isLoading && (
            <div className="mt-8 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                <h2 className="text-2xl font-bold text-gray-100">Generated Content</h2>
                <button
                  onClick={handleSaveAll}
                  aria-label="Save all generated content to a file"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-300"
                >
                  <SaveIcon className="h-5 w-5" />
                  Save All
                </button>
              </div>
              <div className="space-y-8 pt-6">
                {activeTab === 'analyze' && imagePrompts.length > 0 ? (
                  imagePrompts.map((prompt, index) => (
                    <div key={`scene-${index}`} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                      <h3 className="text-2xl font-bold text-gray-200 mb-4 border-b border-gray-600 pb-2">Scene {index + 1}</h3>
                      <div className="space-y-6 mt-4">
                        <div>
                          <h4 className="text-lg font-semibold text-indigo-400 mb-2">Image Prompt</h4>
                          <PromptCard prompt={prompt} />
                        </div>
                        {videoPrompts[index] && (
                          <div>
                            <h4 className="text-lg font-semibold text-teal-400 mb-2">Video Prompt</h4>
                            <PromptCard prompt={videoPrompts[index]} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    {imagePrompts.length > 0 && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-200 mb-4">Image Prompt</h3>
                            <div className="space-y-4">
                                {imagePrompts.map((p, i) => (
                                <PromptCard key={`img-${i}`} prompt={p} />
                                ))}
                            </div>
                        </div>
                    )}
                    {videoPrompts.length > 0 && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-200 mb-4">Video Prompt</h3>
                            <div className="space-y-4">
                                {videoPrompts.map((p, i) => (
                                  <PromptCard key={`vid-${i}`} prompt={p} />
                                ))}
                            </div>
                        </div>
                    )}
                  </>
                )}
                {youtubeMeta && (
                  <div>
                      <h3 className="text-xl font-bold text-gray-200 mb-4">YouTube Shorts Meta</h3>
                      <YoutubeMetaCard meta={youtubeMeta} />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;