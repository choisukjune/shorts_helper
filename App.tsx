import React, { useState, useCallback, useRef } from 'react';
import { YoutubeMeta, Scene, GeneratedImage } from './types';
import { 
  generateYoutubeMeta, 
  generatePromptsFromImage, 
  generatePromptsFromImageV2,
  generateVideoStartFrames,
  regenerateVideoStartFrame,
  extractVideoId, 
  imageUrlToBase64, 
  generateRandomizedContent,
  generateImageVariations,
  generateVideoPromptForImage,
  generateNextScene,
  generateNextSceneFromUploadedImage,
  generateAllPromptsForConcept
} from './services/geminiService';
import CopyableField from './components/CopyableField';
import { SparklesIcon, MagicWandIcon, LinkIcon, DownloadIcon, UploadIcon, RefreshIcon } from './components/icons';

const initialAnimalOptions = ['Lion', 'Tiger', 'Grizzly Bear', 'Wolf', 'Rhinoceros', 'Elephant', 'Hippo', 'Gorilla', 'Orange Tabby Cat', 'Golden Retriever', 'Capybara', 'Red Panda', 'Fox', 'Eagle', 'Shark', 'Giant Snake', 'Enormous Turtle', 'Massive Alligator', 'Huge Wild Boar', 'Large Stag', 'Moose', 'Rabbit', 'Chick', 'Puppy', 'Duckling', 'Baby Bird'];
const initialBackgroundOptions = ['Misty Redwood Forest at dawn', 'Sun-scorched Serengeti plains under a vast sky', 'Icy Arctic glacier field with cracking ice', 'Volcanic plains of Iceland with black sand', 'Lush, dense Amazonian rainforest floor', 'Dramatic cliffside overlooking a stormy sea', 'Cherry blossom grove in a Japanese garden', 'Vibrant, arid Australian outback'];
const initialDeepSeaCreatureOptions = [
    'Giant Squid', 'Anglerfish', 'Vampire Squid', 'Goblin Shark', 'Colossal Squid', 
    'Frilled Shark', 'Blobfish', 'Dumbo Octopus', 'Harp Sponge', 'Ping-Pong Tree Sponge', 
    'Helmet Jellyfish', 'Marrus Orthocanna', 'Lampocteis cruentiventer', 'Cestum Veneris', 
    'Pigbutt Worm', 'Eulagisca gigantea', 'Clione limacina', 'Scaly-foot Gastod', 
    'Cirroctopus', 'Sepioloidea pacifica', 'Cockatoo Squid', 'Magnapinna Squid', 
    'Gigantocypris', 'Gnathophausia ingens', 'Cystisoma', 'Bathynomus giganteus', 
    'Fan Lobster', 'Giant Ghost Shrimp', 'Yeti Crab', 'Sea Pig', 'Basket Star', 
    'Octacnemus', 'Salp', 'Snipe Eel', 'Monognathus', 'Pelican Eel', 'Gulper Eel', 
    'Barreleye Fish', 'Hatchetfish', 'Viperfish', 'Trapjaw Fish', 'Black Dragonfish', 
    'Tripod Fish', 'Gigantura', 'Needle Mat Anglerfish', 'Fanfin Anglerfish'
];
const initialDeepSeaBackgroundOptions = ['On the deck of a storm-tossed research vessel in the North Atlantic', 'At the edge of a bioluminescent coral garden on the abyssal plain', 'Next to a massive whale fall teeming with strange life', 'In a field of towering hydrothermal vents spewing black smoke', 'On the rusty deck of a sunken WWII submarine wreck'];

const initialFishingBackgroundOptions = ['calm open sea at sunset', 'misty lake at dawn', 'fast-flowing river in a pine forest', 'choppy coastal waters near rocky cliffs'];
const initialTrophyFishOptions = ['Massive Blue Marlin', 'Giant Tuna', 'Goliath Grouper', 'Legendary Giant Catfish', 'Enormous Halibut'];

const initialSeaPredatorOptions = ['Great White Shark', 'Orca', 'Tiger Shark', 'Saltwater Crocodile', 'Giant Squid', 'Leopard Seal', 'Bull Shark', 'Megalodon (Extinct)'];
const initialSeaBackgroundOptions = ['in a vibrant coral reef teeming with life', 'in the dark, crushing pressure of the abyssal zone', 'in a dense, swaying kelp forest', 'near a smoking hydrothermal vent on the ocean floor', 'in the vast, empty blue of the open ocean', 'around the rusting carcass of a sunken shipwreck'];


type Tab = 'promptBuilder' | 'celebration' | 'faceoff' | 'friendship' | 'selfie' | 'analyze' | 'deepsea' | 'analyze2' | 'fishing' | 'volleyball' | 'beachVolleyball' | 'swimming' | 'track';
type DeepSeaVideoStyle = 'cinematic' | 'selfie' | 'groupPhoto';
type FaceoffPreset = 'land' | 'sea';
type AthleteStance = 'standing' | 'sitting' | 'cross-legged' | 'back-view' | 'side-view' | 'prone' | 'lying-down' | 'kneeling' | 'jumping' | 'stretching' | 'drinking-water' | 'wiping-sweat' | 'checking-gear';

const stanceOptions: { value: AthleteStance; label: string }[] = [
  { value: 'standing', label: '서있는 (Standing)' },
  { value: 'sitting', label: '앉아있는 (Sitting)' },
  { value: 'cross-legged', label: '양반다리 (Cross-legged)' },
  { value: 'back-view', label: '뒷모습 (Back view)' },
  { value: 'side-view', label: '옆모습 (Side view)' },
  { value: 'prone', label: '엎드려있는 (Prone)' },
  { value: 'lying-down', label: '누워있는 (Lying down)' },
  { value: 'kneeling', label: '무릎 꿇고 있는 (Kneeling)' },
  { value: 'jumping', label: '점프하는 (Jumping)' },
  { value: 'stretching', label: '스트레칭하는 (Stretching)' },
  { value: 'drinking-water', label: '물 마시는 (Drinking water)' },
  { value: 'wiping-sweat', label: '수건으로 땀 닦는 (Wiping sweat)' },
  { value: 'checking-gear', label: '장비를 확인하는 (Checking gear)' },
];


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('promptBuilder');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRandomizing, setIsRandomizing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<boolean>(false);
  const [isGeneratingNextScene, setIsGeneratingNextScene] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState<boolean>(false);
  const [regeneratingFrameIndex, setRegeneratingFrameIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [youtubeMeta, setYoutubeMeta] = useState<YoutubeMeta | null>(null);
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
  const [uploadedFrameBaseImage, setUploadedFrameBaseImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameFileInputRef = useRef<HTMLInputElement>(null);

  const [animal1Options, setAnimal1Options] = useState<string[]>(initialAnimalOptions);
  const [animal2Options, setAnimal2Options] = useState<string[]>(initialAnimalOptions);
  const [animal3Options, setAnimal3Options] = useState<string[]>(initialAnimalOptions);
  const [backgroundOptions, setBackgroundOptions] = useState<string[]>(initialBackgroundOptions);
  const [deepSeaCreatureOptions, setDeepSeaCreatureOptions] = useState<string[]>(initialDeepSeaCreatureOptions);
  const [deepSeaBackgroundOptions, setDeepSeaBackgroundOptions] = useState<string[]>(initialDeepSeaBackgroundOptions);
  const [fishingBackgroundOptions, setFishingBackgroundOptions] = useState<string[]>(initialFishingBackgroundOptions);
  const [trophyFishOptions, setTrophyFishOptions] = useState<string[]>(initialTrophyFishOptions);
  const [seaPredatorOptions, setSeaPredatorOptions] = useState<string[]>(initialSeaPredatorOptions);
  const [seaBackgroundOptions, setSeaBackgroundOptions] = useState<string[]>(initialSeaBackgroundOptions);

  const [animal1, setAnimal1] = useState('Grizzly Bear');
  const [animal2, setAnimal2] = useState('Tiger');
  const [animal3, setAnimal3] = useState('Rhinoceros');
  const [background, setBackground] = useState(initialBackgroundOptions[1]);
  const [shortsUrl, setShortsUrl] = useState('');
  const [deepSeaVideoStyle, setDeepSeaVideoStyle] = useState<DeepSeaVideoStyle>('cinematic');
  const [trophyFish, setTrophyFish] = useState(initialTrophyFishOptions[0]);
  const [fishingBackground, setFishingBackground] = useState(initialFishingBackgroundOptions[0]);
  const [faceoffPreset, setFaceoffPreset] = useState<FaceoffPreset>('land');
  
  const [promptConcept, setPromptConcept] = useState<string>('');
  const [promptBuilderCountry, setPromptBuilderCountry] = useState<string>('');
  const [promptBuilderResult, setPromptBuilderResult] = useState<{
      imagePrompt: string;
      videoPrompt: string;
      englishTitle: string;
      japaneseTitle: string;
      tags: string;
      englishDescription: string;
      japaneseDescription: string;
  } | null>(null);
  const [isBuildingPrompt, setIsBuildingPrompt] = useState<boolean>(false);

  // Volleyball state
  const [country, setCountry] = useState('South Korea');
  const [volleyballPose, setVolleyballPose] = useState('executing a powerful jump spike');
  const [volleyballFraming, setVolleyballFraming] = useState<'full body' | 'upper body'>('full body');
  const [volleyballStance, setVolleyballStance] = useState<AthleteStance>('standing');

  // Beach Volleyball state
  const [beachVolleyballCountry, setBeachVolleyballCountry] = useState('South Korea');
  const [beachVolleyballPose, setBeachVolleyballPose] = useState('diving for a dig in the sand');
  const [beachVolleyballFraming, setBeachVolleyballFraming] = useState<'full body' | 'upper body'>('full body');
  const [beachVolleyballStance, setBeachVolleyballStance] = useState<AthleteStance>('standing');

  // Swimming state
  const [swimmingCountry, setSwimmingCountry] = useState('South Korea');
  const [swimmingAction, setSwimmingAction] = useState('diving off the starting block');
  const [swimmingFraming, setSwimmingFraming] = useState<'full body' | 'upper body'>('full body');
  const [swimmingStance, setSwimmingStance] = useState<AthleteStance>('standing');

  // Track and Field state
  const [trackCountry, setTrackCountry] = useState('South Korea');
  const [trackAction, setTrackAction] = useState('sprinting out of the starting blocks');
  const [trackFraming, setTrackFraming] = useState<'full body' | 'upper body'>('full body');
  const [trackStance, setTrackStance] = useState<AthleteStance>('standing');


  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setScenes([]);
    setYoutubeMeta(null);
    setThumbnailBase64(null);
    setUploadedFrameBaseImage(null);
    setPromptBuilderResult(null);

    switch (tab) {
      case 'celebration':
        setAnimal1('Grizzly Bear');
        setBackground(initialBackgroundOptions[1]);
        break;
      case 'faceoff':
      case 'friendship':
        setFaceoffPreset('land');
        setAnimal1('Grizzly Bear');
        setAnimal2('Tiger');
        setBackground(initialBackgroundOptions[1]);
        break;
      case 'selfie':
        setAnimal1('Orange Tabby Cat');
        setAnimal2('Golden Retriever');
        setAnimal3('Capybara');
        setBackground('Cherry blossom grove in a Japanese garden');
        break;
      case 'deepsea':
        setAnimal1(initialDeepSeaCreatureOptions[0]);
        setBackground(initialDeepSeaBackgroundOptions[0]);
        setDeepSeaVideoStyle('cinematic');
        break;
       case 'fishing':
        setTrophyFish(initialTrophyFishOptions[0]);
        setFishingBackground(initialFishingBackgroundOptions[0]);
        break;
      case 'volleyball':
        setCountry('South Korea');
        setVolleyballPose('executing a powerful jump spike');
        setVolleyballFraming('full body');
        setVolleyballStance('standing');
        break;
      case 'beachVolleyball':
        setBeachVolleyballCountry('South Korea');
        setBeachVolleyballPose('diving for a dig in the sand');
        setBeachVolleyballFraming('full body');
        setBeachVolleyballStance('standing');
        break;
      case 'swimming':
        setSwimmingCountry('South Korea');
        setSwimmingAction('diving off the starting block');
        setSwimmingFraming('full body');
        setSwimmingStance('standing');
        break;
      case 'track':
        setTrackCountry('South Korea');
        setTrackAction('sprinting out of the starting blocks');
        setTrackFraming('full body');
        setTrackStance('standing');
        break;
      case 'analyze':
      case 'analyze2':
        setShortsUrl('');
        break;
      case 'promptBuilder':
        setPromptConcept('');
        setPromptBuilderCountry('');
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
      return `Epic showdown between a massive ${currentAnimal1.toLowerCase()} and a ferocious ${currentAnimal2.toLowerCase()} ${currentBackground.toLowerCase()}. They are locked in a fierce battle, snarling and clawing at each other. The scene is chaotic and brutal. Ultra-realistic, cinematic lighting, 8K detail, wildlife photography style, ultra real photo.`;
  }, []);

  const createFaceoffVideoPrompt = useCallback((animal1: string, animal2: string, background: string): string => {
    return `An ultra-realistic, brutal cinematic video of a life-or-death battle between a massive ${animal1.toLowerCase()} and a ferocious ${animal2.toLowerCase()} ${background.toLowerCase()}.
The camera work is dynamic and visceral, using a mix of shaky handheld shots close to the ground and slow-motion close-ups to capture the raw power of the animals.
The fight begins with a low-angle tracking shot as the ${animal1.toLowerCase()} charges, kicking up dirt and debris. Quick cuts show the ${animal2.toLowerCase()} dodging and lunging back with a snarl.
An extreme close-up in slow motion captures teeth clashing and claws tearing at fur. The camera whip-pans to follow a spray of mud as one of the animals is thrown to the ground, only to recover with a roar.
The sound design is intense and immersive: guttural growls, the thud of bodies colliding, the snap of branches underfoot, and the heavy breathing of the exhausted combatants. No music, only the raw sounds of the brutal fight.
The lighting is dramatic, with harsh sunlight breaking through the trees (if in a forest) or the stark, unforgiving light of the open plains, casting long, dynamic shadows.
The scene ends with a tense standoff, both animals bloodied and breathing heavily, before one final, decisive lunge. Shot in gritty 8K with a wildlife documentary feel.`;
  }, []);

  const createFriendshipPrompt = useCallback((currentAnimal1: string, currentAnimal2: string, currentBackground: string): string => {
      return `An unlikely friendship between a massive ${currentAnimal1.toLowerCase()} and a gentle ${currentAnimal2.toLowerCase()} ${currentBackground.toLowerCase()}. They are resting together peacefully, showing affection. The scene is heartwarming and serene. Ultra-realistic, cinematic lighting, 8K detail, wildlife photography style, ultra real photo.`;
  }, []);

  const createFriendshipVideoPrompt = useCallback((animal1: string, animal2: string, background: string): string => {
    return `An ultra-realistic, heartwarming cinematic video of an unlikely friendship between a massive ${animal1.toLowerCase()} and a gentle ${animal2.toLowerCase()} ${background.toLowerCase()}.
The camera work is slow and intimate, using soft focus and gentle pans to capture their tender moments.
The video begins with a close-up on the ${animal1.toLowerCase()} gently nuzzling the ${animal2.toLowerCase()}. A slow tracking shot reveals them lying side-by-side, one grooming the other.
The sound design is calm and immersive: the gentle rustle of leaves, soft breathing, and perhaps a contented sigh. A subtle, heartwarming musical score swells gently in the background.
The lighting is soft and warm, like golden hour sunlight filtering through the trees or a gentle morning mist, creating a dreamlike atmosphere.
The scene ends with a wide shot of the two animals curled up together, sleeping peacefully, a perfect picture of friendship against all odds. Shot in serene 8K with a nature documentary feel.`;
  }, []);

  const createSelfiePrompt = useCallback((taker: string, friend1: string, friend2: string, bg: string): string => {
      return `A funny, ultra-realistic selfie. A ${taker.toLowerCase()} is holding the camera, smiling widely. In the background, a ${friend1.toLowerCase()} and a ${friend2.toLowerCase()} are posing comically. The setting is a ${bg.toLowerCase()}. The lighting is bright and cheerful, like a smartphone flash. 8K detail, ultra real photo.`;
  }, []);

  const createDeepSeaPrompt = useCallback((creature: string, setting: string): string => {
      return `First-person POV shot from the eyes of a fisherman standing ${setting.toLowerCase()}. In front of you, the colossal head of a deep-sea creature, a ${creature.toLowerCase()}, lies immense and alien-like, its body stretching away down the center of the deck. Your own gloved hands might be visible at the bottom of the frame, gripping a railing. Other fishermen in dark, wet rain gear and boots cautiously circle the massive catch, their faces a mix of awe and exhaustion. The boat's mast looms overhead, with the view dominated by the deck and the creature, under a bleak, overcast sky. The atmosphere is one of grim triumph after a monumental struggle. Ultra-realistic, wide-angle lens, body-cam footage style, sharp focus, immense detail, 8K, ultra real photo.`;
  }, []);

  const createDeepSeaVideoPrompt = useCallback((creature: string, setting: string): string => {
    return `Dynamic, chaotic scene ${setting.toLowerCase()}. Fishermen in navy waterproof suits scramble around a colossal, glowing deep-sea creature, a monstrous ${creature}. Some men are trying to secure the twitching beast with thick, heavy ropes, pulling and straining. Another fisherman slips on the wet deck and falls, quickly scrambling back up. The crew members shout wordlessly at each other, pointing and gesturing urgently as the creature thrashes, spraying water everywhere. The camera work is energetic and immersive, using a handheld style that follows the most intense action. It starts with a low-angle shot, making the creature seem immense, then whip-pans to a fisherman's face, filled with a mix of terror and exhilaration. There are quick cuts between the struggling men, the straining ropes, and extreme close-ups of the creature's alien-like eye or twitching tentacle. A large wave crashes over the side of the boat, drenching everyone and causing the camera to jerk wildly. The scene is lit by the boat's harsh deck lights against a dark, stormy sky, creating dramatic shadows. No spoken dialogue, only the sounds of the raging storm, crashing waves, the creaking boat, straining ropes, and the panicked, non-verbal shouts of the crew. Shot in ultra-realistic 8K with a gritty, documentary feel.`;
  }, []);

  const createDeepSeaSelfieVideoPrompt = useCallback((creature: string, setting: string): string => {
    return `First-person POV video selfie from a phone held by a young, excited fisherman in a yellow rain slicker. He's grinning wildly at the camera, trying to speak but only breathless, shaky gasps come out. He suddenly whips the camera around to film the colossal, bizarre deep-sea creature, a ${creature}, that lies across the deck, ${setting.toLowerCase()}. As he does, the creature unexpectedly thrashes a limb, causing him to stumble backward with a yell, nearly dropping the phone. The camera feed glitches for a second. He recovers, pointing the shaky camera back at his own wide-eyed, terrified face, then pans shakily across the other crew members who are scrambling away from the creature. The video is chaotic and unstable, capturing the raw fear and adrenaline of the moment. The only sounds are the roaring ocean, the creaking boat, the creature's wet slapping sounds, and the fisherman's panicked gasps and a single, sharp wordless yell. Lighting is harsh and direct from the phone's flashlight. Shot to look like an authentic, found-footage 8K phone recording.`;
  }, []);

  const createDeepSeaGroupPhotoVideoPrompt = useCallback((creature: string, setting: string): string => {
    return `A chaotic, wide-angle video shot from the perspective of one fisherman trying to organize a triumphant group photo. ${setting.toLowerCase()}, a group of proud fishermen in rain gear are laughing and shouting, trying to pose around their monumental catch: a colossal deep-sea ${creature.toLowerCase()}. The man filming is yelling wordlessly, gesturing for them to get closer together. One fisherman playfully shoves another, who stumbles into a third, creating a domino effect of chaos. Another bold fisherman tries to climb onto the creature's back for a better pose. Suddenly, a large wave crashes over the side, drenching the entire group and making the camera lurch downwards. The fishermen react with shocked, wordless shouts and laughter, completely ruining the photo attempt. The video is shaky and full of raw, energetic movement, capturing the wild celebration and the power of the sea. The sounds are a mix of triumphant non-verbal cheers, laughter, the huge splash of the wave, and the boat creaking. No spoken dialogue. Shot to look like a realistic 8K phone video.`;
  }, []);

  const createFishingPrompt = useCallback((currentBackground: string): string => {
    return `An ultra-realistic, cinematic, upper-body close-up photo of a young Asian person fishing on a small boat in a ${currentBackground.toLowerCase()}. The person is viewed from behind, wearing a black fishing jacket, life vest, cap, and gloves, holding a fishing rod that extends out toward the water. The focus is tight on the subject. The scene is bathed in the warm light of a setting sun, painting the sky and water in rich shades of gold and orange. Gentle waves ripple behind the moving boat, leaving a foamy trail. Warm sunset lighting, realistic reflections on the wet surfaces, ultra-detailed textures, 9:16 aspect ratio, 8K cinematic realism, natural composition.`;
  }, []);

  const createFishingVideoPrompt = useCallback((currentFish: string, currentBackground: string): string => {
    return `An intensely dynamic 9:16 cinematic video capturing the brutal, visceral struggle of an Asian man battling a giant fish on a small boat in the ${currentBackground.toLowerCase()}.
The scene opens with an extreme close-up on the man's hands, knuckles white as he grips the rod, the reel screaming. The camera whip-pans to his face, sweat beading on his forehead, teeth gritted in exertion.
Dynamic, shaky handheld camera work follows the man as he's violently jerked across the deck, struggling to keep his footing. Quick cuts show the fishing rod bent to a breaking point, the line taut as a razor. Water sprays over the side, drenching the lens for a moment.
The tension climaxes as the colossal ${currentFish.toLowerCase()} erupts from the water in a chaotic explosion of spray, thrashing wildly. The camera captures this in dramatic slow-motion, showcasing the fish's immense power and shimmering scales under the bright sun.
After a grueling battle, the man finally hauls the exhausted beast onto the deck. The final shot is a triumphant, low-angle view of the man, breathing heavily, standing over his massive catch. He looks directly into the camera with a mix of exhaustion and pure elation, mirroring the pride of the attached photo.
Shot composition: rapid cuts, extreme close-ups on straining muscles and equipment, dramatic slow-motion breach, dutch angles to convey instability, ending on a powerful wide-angle reveal.
Style: hyper-realistic, gritty, high-energy documentary style with vibrant, high-contrast ocean tones.`;
  }, []);

  const createVolleyballPrompt = useCallback((
    currentCountry: string, 
    currentPose: string,
    currentFraming: 'full body' | 'upper body',
    currentStance: AthleteStance
  ): string => {
    const framingShot = currentFraming === 'full body' ? 'full-body' : 'upper-body';
    let stanceContext: string;
    switch (currentStance) {
      case 'standing': stanceContext = 'on the court,'; break;
      case 'sitting': stanceContext = 'sitting on a bench on the side of the court,'; break;
      case 'cross-legged': stanceContext = 'sitting cross-legged on the court floor,'; break;
      case 'back-view': stanceContext = 'on the court with her back to the camera,'; break;
      case 'side-view': stanceContext = 'on the court in a profile view,'; break;
      case 'prone': stanceContext = 'lying prone on the court floor,'; break;
      case 'lying-down': stanceContext = 'lying on her back on the court floor,'; break;
      case 'kneeling': stanceContext = 'kneeling on the court,'; break;
      case 'jumping': stanceContext = 'in mid-air, jumping on the court,'; break;
      case 'stretching': stanceContext = 'on the court, stretching her muscles,'; break;
      case 'drinking-water': stanceContext = 'on the side of the court, drinking water from a bottle,'; break;
      case 'wiping-sweat': stanceContext = 'on the side of the court, wiping sweat with a towel,'; break;
      case 'checking-gear': stanceContext = 'on the court, checking her gear,'; break;
    }

    return `An ultra-realistic, cinematic, ${framingShot} action shot of a female ${currentCountry.toLowerCase()} national volleyball player. The scene is on a professional, brightly lit indoor court. She is ${stanceContext} in the middle of ${currentPose.toLowerCase()}. Her expression is one of intense focus and determination, with beads of sweat on her face and arms, highlighting the physical exertion. She wears a highly realistic, modern two-piece volleyball uniform that prominently features the ${currentCountry.toLowerCase()} national flag emblem. The uniform, made of high-performance, sweat-wicking fabric like spandex and mesh, fits snugly to her athletic form, showing subtle wrinkles and glistening with sweat under the bright stadium lights. The background is softly blurred but clearly depicts a packed stadium with spectators and sports photographers with large telephoto lenses aimed at the action. The scene feels authentic and dynamic, captured in 8K cinematic sports photography style, with dramatic lighting, perfect composition, and the athlete filling the 9:16 frame. ultra real photo.`;
  }, []);

  const createVolleyballVideoPrompt = useCallback((
      currentCountry: string, 
      currentPose: string,
      currentStance: AthleteStance
  ): string => {
      let introAction: string;
      let actionDetails: string;

      switch (currentStance) {
        case 'standing':
        case 'jumping':
          introAction = `The video opens with the player frozen for a split second in the pose of ${currentPose.toLowerCase()}. Then, the action continues in dramatic slow motion.`;
          actionDetails = `If she's spiking, the ball compresses against her hand before rocketing over the net. If she's digging, the ball pancakes off her arms, sending a spray of sweat into the air.`;
          break;
        case 'sitting':
        case 'cross-legged':
        case 'back-view':
        case 'side-view':
        case 'prone':
        case 'lying-down':
        case 'kneeling':
        case 'stretching':
        case 'drinking-water':
        case 'wiping-sweat':
        case 'checking-gear':
          introAction = `The player is seen in the initial pose. She then transitions smoothly into a ready stance and the scene explodes into action.`;
          actionDetails = `The camera follows her as she prepares to enter the game or during a timeout, culminating in a powerful play like a spike or a dive.`;
          break;
      }

      return `An ultra-realistic, high-energy cinematic video of a female ${currentCountry.toLowerCase()} national volleyball player. The scene, based on the attached image, explodes into motion.
${introAction} ${actionDetails}
The camera work is dynamic, tracking the player's movement with a low-angle shot to emphasize her power and athleticism. Quick cuts show the reactions of her teammates, the tense faces of the opposition, and flashes from the photographers' cameras in the background.
The sound design is immersive and powerful: the squeak of shoes on the court, the sharp 'thwack' of the ball, the player's grunt of exertion, and the muffled roar of the crowd. No music, just the raw, intense sounds of a high-stakes professional volleyball match.
The video ends with a point being scored or a transition back to the bench, followed by a tight shot on the player's triumphant or determined expression. Shot in gritty 8K with a sports documentary feel.`;
  }, []);

  const createBeachVolleyballPrompt = useCallback((
    currentCountry: string, 
    currentPose: string,
    currentFraming: 'full body' | 'upper body',
    currentStance: AthleteStance
  ): string => {
    const framingShot = currentFraming === 'full body' ? 'full-body' : 'upper-body';
    let stanceContext: string;
    switch (currentStance) {
      case 'standing': stanceContext = 'on the sand,'; break;
      case 'sitting': stanceContext = 'sitting on the sand near the net,'; break;
      case 'cross-legged': stanceContext = 'sitting cross-legged on the sand,'; break;
      case 'back-view': stanceContext = 'on the court with her back to the camera,'; break;
      case 'side-view': stanceContext = 'on the court in a profile view,'; break;
      case 'prone': stanceContext = 'lying prone on the sand,'; break;
      case 'lying-down': stanceContext = 'lying on her back on the sand,'; break;
      case 'kneeling': stanceContext = 'kneeling on the sand,'; break;
      case 'jumping': stanceContext = 'in mid-air, jumping on the sand,'; break;
      case 'stretching': stanceContext = 'on the sand, stretching her muscles,'; break;
      case 'drinking-water': stanceContext = 'on the side of the court, drinking water from a bottle,'; break;
      case 'wiping-sweat': stanceContext = 'on the side of the court, wiping sweat with a towel,'; break;
      case 'checking-gear': stanceContext = 'on the sand, adjusting her sunglasses,'; break;
    }

    return `An ultra-realistic, cinematic, ${framingShot} action shot of a female ${currentCountry.toLowerCase()} national beach volleyball player. The scene is on a professional, sun-drenched sandy beach court. She is ${stanceContext} in the middle of ${currentPose.toLowerCase()}. Her expression is one of intense focus and determination, with beads of sweat and grains of sand on her sun-kissed skin, highlighting the physical exertion. She wears a highly realistic, modern two-piece bikini-style beach volleyball uniform that prominently features the ${currentCountry.toLowerCase()} national flag emblem. The uniform, made of high-performance, quick-drying fabric like spandex, fits snugly to her athletic form, showing subtle wrinkles and glistening with sweat under the bright sun. The background is softly blurred but clearly depicts a packed beachside stadium with spectators under umbrellas and the blue ocean visible in the distance. The scene feels authentic and dynamic, captured in 8K cinematic sports photography style, with dramatic lighting, perfect composition, and the athlete filling the 9:16 frame. ultra real photo.`;
  }, []);

  const createBeachVolleyballVideoPrompt = useCallback((
      currentCountry: string, 
      currentPose: string,
      currentStance: AthleteStance
  ): string => {
      let introAction: string;
      let actionDetails: string;

      switch (currentStance) {
        case 'standing':
        case 'jumping':
          introAction = `The video opens with the player frozen for a split second in the pose of ${currentPose.toLowerCase()}. Then, the action continues in dramatic slow motion.`;
          actionDetails = `If she's spiking, the ball compresses against her hand before rocketing over the net. If she's digging, sand sprays into the air as she dives.`;
          break;
        case 'sitting':
        case 'cross-legged':
        case 'back-view':
        case 'side-view':
        case 'prone':
        case 'lying-down':
        case 'kneeling':
        case 'stretching':
        case 'drinking-water':
        case 'wiping-sweat':
        case 'checking-gear':
          introAction = `The player is seen in the initial pose. She then transitions smoothly into a ready stance and the scene explodes into action.`;
          actionDetails = `The camera follows her as she prepares to serve or receive, culminating in a powerful play like a spike or a dive into the sand.`;
          break;
      }

      return `An ultra-realistic, high-energy cinematic video of a female ${currentCountry.toLowerCase()} national beach volleyball player. The scene, based on the attached image, explodes into motion on a sun-drenched beach court.
${introAction} ${actionDetails}
The camera work is dynamic, tracking the player's movement with a low-angle shot to emphasize her power and athleticism against the bright sky. Quick cuts show the reactions of her partner, the tense faces of the opposition, and the cheering crowd.
The sound design is immersive and powerful: the soft thud of feet on sand, the sharp 'thwack' of the ball, the player's grunt of exertion, and the roar of the crowd mixed with the distant sound of crashing waves. No music, just the raw, intense sounds of a high-stakes professional beach volleyball match.
The video ends with a point being scored, followed by a tight shot on the player's triumphant or determined expression as she high-fives her partner. Shot in gritty 8K with a sports documentary feel.`;
  }, []);

  const createSwimmingPrompt = useCallback((
    currentCountry: string, 
    currentAction: string,
    currentFraming: 'full body' | 'upper body',
    currentStance: AthleteStance
  ): string => {
    const framingShot = currentFraming === 'full body' ? 'full-body' : 'upper-body';
    let stanceContext: string;
    switch (currentStance) {
      case 'standing': stanceContext = 'standing on the starting block,'; break;
      case 'sitting': stanceContext = 'sitting on the edge of the pool deck,'; break;
      case 'cross-legged': stanceContext = 'sitting cross-legged on the pool deck,'; break;
      case 'back-view': stanceContext = 'standing on the pool deck with her back to the camera,'; break;
      case 'side-view': stanceContext = 'on the pool deck in a profile view,'; break;
      case 'prone': stanceContext = 'lying prone on the pool deck,'; break;
      case 'lying-down': stanceContext = 'lying on her back on the pool deck,'; break;
      case 'kneeling': stanceContext = 'kneeling on the pool deck,'; break;
      case 'jumping': stanceContext = 'in mid-air, jumping into the pool,'; break;
      case 'stretching': stanceContext = 'on the pool deck, stretching her muscles,'; break;
      case 'drinking-water': stanceContext = 'on the side of the pool, drinking water from a bottle,'; break;
      case 'wiping-sweat': stanceContext = 'on the side of the pool, wiping sweat with a towel,'; break;
      case 'checking-gear': stanceContext = 'on the pool deck, checking her goggles or swim cap,'; break;
    }

    return `An ultra-realistic, cinematic, ${framingShot} action shot of a female ${currentCountry.toLowerCase()} national swimmer. The scene is in a professional, brightly lit indoor aquatic center. She is ${stanceContext} in the middle of ${currentAction.toLowerCase()}. Her expression is one of intense focus and determination, with beads of sweat and water droplets on her face and arms, highlighting the physical exertion. She wears a highly realistic, modern two-piece competition swimsuit that prominently features the ${currentCountry.toLowerCase()} national flag emblem. The swimsuit, made of sleek, water-repellent performance fabric, fits snugly to her athletic form, with water droplets clinging to the surface and her skin. She is not wearing a swim cap, and her wet hair is visible. The background is softly blurred but clearly depicts a packed aquatic center with spectators and sports photographers with large telephoto lenses aimed at the action. The scene feels authentic and dynamic, captured in 8K cinematic sports photography style, with dramatic lighting, perfect composition, and the athlete filling the 9:16 frame. ultra real photo.`;
  }, []);

  const createSwimmingVideoPrompt = useCallback((
      currentCountry: string, 
      currentAction: string,
      currentStance: AthleteStance
  ): string => {
      let introAction: string;
      const actionDetails = `The camera follows her explosive dive into the pool, capturing the splash in stunning detail. Underwater shots show her powerful strokes and kicks, with bubbles trailing behind her.`;
      switch (currentStance) {
        case 'standing':
        case 'jumping':
          introAction = `The video opens with the swimmer frozen for a split second in the pose of ${currentAction.toLowerCase()}. Then, the action continues in dramatic slow motion as she dives into the water.`;
          break;
        case 'sitting':
        case 'cross-legged':
        case 'back-view':
        case 'side-view':
        case 'prone':
        case 'lying-down':
        case 'kneeling':
        case 'stretching':
        case 'drinking-water':
        case 'wiping-sweat':
        case 'checking-gear':
          introAction = `The player is seen in the initial pose. She then stands up, gets on the block, and the scene transitions into the action of ${currentAction.toLowerCase()}.`;
          break;
      }

      return `An ultra-realistic, high-energy cinematic video of a female ${currentCountry.toLowerCase()} national swimmer. The scene, based on the attached image, explodes into motion.
${introAction} ${actionDetails}
The camera work is dynamic, using a mix of above-water tracking shots and underwater follow-cams to emphasize her power and grace. Quick cuts show the tense faces of coaches and flashes from photographers' cameras.
The sound design is immersive and powerful: the sharp starting beep, the explosive splash of entering the water, the muffled sounds of exertion underwater, and the roar of the crowd. No music, just the raw, intense sounds of a high-stakes professional swim meet.
The video ends with her hand touching the wall, followed by a tight shot on her determined, breathless expression as she looks up at the scoreboard. Shot in gritty 8K with a sports documentary feel.`;
  }, []);

  const createTrackPrompt = useCallback((
    currentCountry: string, 
    currentAction: string,
    currentFraming: 'full body' | 'upper body',
    currentStance: AthleteStance
  ): string => {
    const framingShot = currentFraming === 'full body' ? 'full-body' : 'upper-body';
    let stanceContext: string;
    switch (currentStance) {
      case 'standing': stanceContext = 'standing on the starting block,'; break;
      case 'sitting': stanceContext = 'sitting on a bench on the side of the track,'; break;
      case 'cross-legged': stanceContext = 'sitting cross-legged on the track,'; break;
      case 'back-view': stanceContext = 'standing on the track with her back to the camera,'; break;
      case 'side-view': stanceContext = 'on the track in a profile view,'; break;
      case 'prone': stanceContext = 'lying prone on the track,'; break;
      case 'lying-down': stanceContext = 'lying on her back on the track,'; break;
      case 'kneeling': stanceContext = 'kneeling on the track,'; break;
      case 'jumping': stanceContext = 'in mid-air, jumping over a hurdle,'; break;
      case 'stretching': stanceContext = 'on the track, stretching her muscles,'; break;
      case 'drinking-water': stanceContext = 'on the side of the track, drinking water from a bottle,'; break;
      case 'wiping-sweat': stanceContext = 'on the side of the track, wiping sweat with a towel,'; break;
      case 'checking-gear': stanceContext = 'on the track, checking her running shoes,'; break;
    }

    return `An ultra-realistic, cinematic, ${framingShot} action shot of a female ${currentCountry.toLowerCase()} national track and field athlete. The scene is in a professional, brightly lit outdoor track and field stadium. She is ${stanceContext} in the middle of ${currentAction.toLowerCase()}. Her expression is one of intense focus and determination, with beads of sweat on her face and arms, highlighting the physical exertion. She wears a highly realistic, modern two-piece track uniform that prominently features the ${currentCountry.toLowerCase()} national flag emblem. The uniform, made of lightweight, aerodynamic fabric, fits snugly to her athletic form, showing subtle wrinkles from movement and glistening with sweat under the bright stadium sun. The background is softly blurred but clearly depicts a packed stadium with spectators and sports photographers with large telephoto lenses aimed at the action. The scene feels authentic and dynamic, captured in 8K cinematic sports photography style, with dramatic lighting, perfect composition, and the athlete filling the 9:16 frame. ultra real photo.`;
  }, []);

  const createTrackVideoPrompt = useCallback((
      currentCountry: string, 
      currentAction: string,
      currentStance: AthleteStance
  ): string => {
      let introAction: string;
      const actionDetails = `The camera follows her explosive start from the blocks, capturing the power in her stride in stunning detail. Low-angle tracking shots show her powerful form as she thunders down the track.`;
      switch (currentStance) {
        case 'standing':
        case 'jumping':
          introAction = `The video opens with the athlete frozen for a split second in the pose of ${currentAction.toLowerCase()}. Then, the action continues in dramatic slow motion as she begins her run.`;
          break;
        case 'sitting':
        case 'cross-legged':
        case 'back-view':
        case 'side-view':
        case 'prone':
        case 'lying-down':
        case 'kneeling':
        case 'stretching':
        case 'drinking-water':
        case 'wiping-sweat':
        case 'checking-gear':
          introAction = `The athlete is seen in the initial pose. She then stands up, gets on the block, and the scene transitions into the action of ${currentAction.toLowerCase()}.`;
          break;
      }

      return `An ultra-realistic, high-energy cinematic video of a female ${currentCountry.toLowerCase()} national track and field athlete. The scene, based on the attached image, explodes into motion.
${introAction} ${actionDetails}
The camera work is dynamic, using a mix of low-angle tracking shots and sideline follow-cams to emphasize her speed and power. Quick cuts show the tense faces of coaches and flashes from photographers' cameras.
The sound design is immersive and powerful: the sharp sound of the starting pistol, the thundering rhythm of spikes hitting the track, the athlete's focused breathing, and the roar of the crowd. No music, just the raw, intense sounds of a high-stakes professional track meet.
The video ends with her crossing the finish line, followed by a tight shot on her determined, breathless expression as she looks up at the scoreboard. Shot in gritty 8K with a sports documentary feel.`;
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
        videoPrompt = createFaceoffVideoPrompt(animal1, animal2, background);
        concept = `${animal1} vs ${animal2} in a ${background}`;
      } else if (activeTab === 'friendship') {
        imagePrompt = createFriendshipPrompt(animal1, animal2, background);
        videoPrompt = createFriendshipVideoPrompt(animal1, animal2, background);
        concept = `Friendship between ${animal1} and ${animal2} in a ${background}`;
      } else if (activeTab === 'selfie') {
          imagePrompt = createSelfiePrompt(animal1, animal2, animal3, background);
          videoPrompt = `A live-action video selfie of a ${animal1} with a ${animal2} and ${animal3} at ${background}.`;
          concept = `Selfie with ${animal1}, ${animal2}, and ${animal3}`;
      } else if (activeTab === 'deepsea') {
        imagePrompt = createDeepSeaPrompt(animal1, background);
        switch (deepSeaVideoStyle) {
          case 'selfie':
            videoPrompt = createDeepSeaSelfieVideoPrompt(animal1, background);
            break;
          case 'groupPhoto':
            videoPrompt = createDeepSeaGroupPhotoVideoPrompt(animal1, background);
            break;
          case 'cinematic':
          default:
            videoPrompt = createDeepSeaVideoPrompt(animal1, background);
            break;
        }
        concept = `Giant ${animal1} captured`;
      } else if (activeTab === 'fishing') {
        imagePrompt = createFishingPrompt(fishingBackground);
        videoPrompt = createFishingVideoPrompt(trophyFish, fishingBackground);
        concept = `Fishing for a ${trophyFish} in a ${fishingBackground}`;
      } else if (activeTab === 'volleyball') {
          imagePrompt = createVolleyballPrompt(country, volleyballPose, volleyballFraming, volleyballStance);
          videoPrompt = createVolleyballVideoPrompt(country, volleyballPose, volleyballStance);
          concept = `A ${country} volleyball player ${volleyballPose}`;
      } else if (activeTab === 'beachVolleyball') {
          imagePrompt = createBeachVolleyballPrompt(beachVolleyballCountry, beachVolleyballPose, beachVolleyballFraming, beachVolleyballStance);
          videoPrompt = createBeachVolleyballVideoPrompt(beachVolleyballCountry, beachVolleyballPose, beachVolleyballStance);
          concept = `A ${beachVolleyballCountry} beach volleyball player ${beachVolleyballPose}`;
      } else if (activeTab === 'swimming') {
          imagePrompt = createSwimmingPrompt(swimmingCountry, swimmingAction, swimmingFraming, swimmingStance);
          videoPrompt = createSwimmingVideoPrompt(swimmingCountry, swimmingAction, swimmingStance);
          concept = `A ${swimmingCountry} swimmer ${swimmingAction}`;
      } else if (activeTab === 'track') {
          imagePrompt = createTrackPrompt(trackCountry, trackAction, trackFraming, trackStance);
          videoPrompt = createTrackVideoPrompt(trackCountry, trackAction, trackStance);
          concept = `A ${trackCountry} track and field athlete ${trackAction}`;
      } else {
        return;
      }

      setScenes([{ imagePrompt, videoPrompt, generatedImages: [] }]);
      
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
  
  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const items = event.clipboardData.items;
    let imageFile: File | null = null;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            imageFile = items[i].getAsFile();
            break;
        }
    }

    if (!imageFile) {
        setError("No image found in clipboard.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
        const base64StringWithData = loadEvent.target?.result as string;
        if (!base64StringWithData) {
            setError("Could not read pasted image.");
            return;
        }
        const base64Data = base64StringWithData.split(',')[1];

        setError(null);
        setIsAnalyzing(true);
        setScenes([]);
        setYoutubeMeta(null);
        setThumbnailBase64(base64Data);
        setUploadedFrameBaseImage(null);

        try {
            const { scene, fullConcept } = await generatePromptsFromImageV2(base64Data);
            setScenes([scene]);
            const meta = await generateYoutubeMeta(fullConcept);
            setYoutubeMeta(meta);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to analyze the pasted image.");
        } finally {
            setIsAnalyzing(false);
        }
    };
    reader.readAsDataURL(imageFile);
  };


  const handleRandomize = async () => {
    if (activeTab === 'analyze' || activeTab === 'analyze2' || activeTab === 'promptBuilder') return;
    setError(null);
    setIsRandomizing(true);
    try {
        if (activeTab === 'volleyball') {
            const result = await generateRandomizedContent('volleyball');
            if (result.pose) setVolleyballPose(result.pose);
        } else if (activeTab === 'beachVolleyball') {
            const result = await generateRandomizedContent('beachVolleyball');
            if (result.pose) setBeachVolleyballPose(result.pose);
        } else if (activeTab === 'swimming') {
            const result = await generateRandomizedContent('swimming');
            if (result.pose) setSwimmingAction(result.pose);
        } else if (activeTab === 'track') {
            const result = await generateRandomizedContent('track');
            if (result.pose) setTrackAction(result.pose);
        } else {
            const result = await generateRandomizedContent(
                activeTab,
                activeTab === 'deepsea' ? deepSeaCreatureOptions : undefined,
                (activeTab === 'faceoff' || activeTab === 'friendship') ? faceoffPreset : undefined
            );
            
            if (activeTab === 'celebration' || activeTab === 'selfie') {
              setAnimal1(result.animal1);
              setAnimal2(result.animal2);
              setAnimal3(result.animal3);
              setBackground(result.background);
              const newAnimalOptions = [...new Set([...animal1Options, result.animal1, result.animal2, result.animal3].filter(Boolean))];
              setAnimal1Options(newAnimalOptions);
              setAnimal2Options(newAnimalOptions);
              setAnimal3Options(newAnimalOptions);
              setBackgroundOptions([...new Set([...backgroundOptions, result.background])]);
            } else if (activeTab === 'faceoff' || activeTab === 'friendship') {
                setAnimal1(result.animal1);
                setAnimal2(result.animal2);
                setBackground(result.background);
                if (faceoffPreset === 'sea') {
                    setSeaPredatorOptions(prev => [...new Set([...prev, result.animal1, result.animal2].filter(Boolean))]);
                    setSeaBackgroundOptions(prev => [...new Set([...prev, result.background])]);
                } else {
                    const newAnimalOptions = [...new Set([...animal1Options, result.animal1, result.animal2].filter(Boolean))];
                    setAnimal1Options(newAnimalOptions);
                    setAnimal2Options(newAnimalOptions);
                    setBackgroundOptions([...new Set([...backgroundOptions, result.background])]);
                }
            } else if (activeTab === 'deepsea') {
              setAnimal1(result.animal1);
              setBackground(result.background);
              setDeepSeaCreatureOptions([...new Set([...deepSeaCreatureOptions, result.animal1])]);
              setDeepSeaBackgroundOptions([...new Set([...deepSeaBackgroundOptions, result.background])]);
            } else if (activeTab === 'fishing') {
                setTrophyFish(result.animal1);
                setFishingBackground(result.background);
                setTrophyFishOptions([...new Set([...trophyFishOptions, result.animal1])]);
                setFishingBackgroundOptions([...new Set([...fishingBackgroundOptions, result.background])]);
            }
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
        content += `${youtubeMeta.en.title} ${youtubeMeta.jp.title}\n`;
        content += `${youtubeMeta.tags}\n\n`;
        content += `${youtubeMeta.en.description}\n\n`;
        content += `${youtubeMeta.jp.description}\n\n`;
    }

    if (scenes.length > 0) {
        content += '--- SCENE PROMPTS ---\n\n';
        scenes.forEach((scene, index) => {
            content += `--- Scene ${index + 1} ---\n\n`;
            content += `Image Prompt:\n${scene.imagePrompt}\n\n`;
            if (scene.videoPrompt) {
              content += `Video Prompt:\n${scene.videoPrompt}\n\n`;
            }
            if(scene.videoPrompts) {
              scene.videoPrompts.forEach((vp, i) => {
                content += `Video Prompt ${i + 1}:\n${vp}\n\n`;
              });
            }
            if (scene.generatedImages) {
                content += `--- Generated Image Video Prompts for Scene ${index + 1} ---\n\n`;
                scene.generatedImages.forEach((img, imgIndex) => {
                    if (img.videoPrompt) {
                        content += `Video Prompt for Image ${imgIndex + 1}:\n${img.videoPrompt}\n\n`;
                    }
                });
            }
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
  
  const handleGenerateImageVariations = async (sceneIndex: number) => {
      const scene = scenes[sceneIndex];
      if (!scene) return;

      setError(null);
      setIsGeneratingImages(true);

      try {
        const images = await generateImageVariations(scene.imagePrompt);
        const newGeneratedImages: GeneratedImage[] = images.map(imgBase64 => ({
            imageBase64: imgBase64
        }));

        setScenes(prev => prev.map((s, i) =>
            i === sceneIndex
                ? { ...s, generatedImages: newGeneratedImages }
                : s
        ));

      } catch (e: any) {
        setError(e.message || "Failed to generate image variations.");
      } finally {
        setIsGeneratingImages(false);
      }
  }

  const handleGenerateVideoPromptForImage = async (sceneIndex: number, imageIndex: number) => {
      const scene = scenes[sceneIndex];
      const image = scene?.generatedImages?.[imageIndex];
      if (!scene || !image) return;

      setError(null);
      
      setScenes(prev => prev.map((s, sIndex) => {
        if (sIndex !== sceneIndex) return s;
        return {
            ...s,
            generatedImages: s.generatedImages?.map((img, iIndex) =>
                iIndex === imageIndex
                    ? { ...img, isGeneratingVideoPrompt: true }
                    : img
            ),
        };
      }));

      try {
        const videoPrompt = await generateVideoPromptForImage(image.imageBase64, scene.imagePrompt);
        
        setScenes(prev => prev.map((s, sIndex) => {
            if (sIndex !== sceneIndex) return s;
            return {
                ...s,
                generatedImages: s.generatedImages?.map((img, iIndex) =>
                    iIndex === imageIndex
                        ? { ...img, videoPrompt: videoPrompt }
                        : img
                ),
            };
        }));

      } catch(e: any) {
        setError(e.message || "Failed to generate video prompt for image.");
      } finally {
        setScenes(prev => prev.map((s, sIndex) => {
            if (sIndex !== sceneIndex) return s;
            return {
                ...s,
                generatedImages: s.generatedImages?.map((img, iIndex) =>
                    iIndex === imageIndex
                        ? { ...img, isGeneratingVideoPrompt: false }
                        : img
                ),
            };
        }));
      }
  }

  const handleGenerateBuilderPrompts = async () => {
    if (!promptConcept.trim()) {
        setError("Please enter a concept.");
        return;
    }
    setError(null);
    setIsBuildingPrompt(true);
    setPromptBuilderResult(null);
    try {
        const result = await generateAllPromptsForConcept(promptConcept, promptBuilderCountry);
        setPromptBuilderResult(result);
    } catch (e: any) {
        setError(e.message || "Failed to generate prompts.");
    } finally {
        setIsBuildingPrompt(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || scenes.length === 0) {
      if (scenes.length === 0) {
        setError("Please generate a scene first before uploading the next frame.");
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64StringWithData = event.target?.result as string;
      if (!base64StringWithData) {
        setError("Could not read the uploaded image.");
        return;
      }
      const base64String = base64StringWithData.split(',')[1];
      
      const previousScene = scenes[scenes.length - 1];
      if (!previousScene) {
        setError("No previous scene to continue from.");
        return;
      }

      setError(null);
      setIsUploading(true);
      try {
        const { newImageBase64, newImagePrompt, newVideoPrompt } = await generateNextSceneFromUploadedImage(
          base64String,
          previousScene.imagePrompt
        );
        const newScene: Scene = {
          imagePrompt: newImagePrompt,
          videoPrompt: newVideoPrompt,
          imageBase64: newImageBase64,
          generatedImages: []
        };
        setScenes(prev => [...prev, newScene]);
      } catch (err: any) {
        setError(err.message || "Failed to generate prompts from uploaded image.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUploadForFrames = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scenes[0]?.videoPrompts) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        if (!base64String) {
            setError("Could not read the uploaded image.");
            return;
        }

        setUploadedFrameBaseImage(base64String);
        setError(null);
        setIsGeneratingFrames(true);
        try {
            const frames = await generateVideoStartFrames(base64String, scenes[0].videoPrompts);
            setScenes(prev => prev.map((s, i) =>
                i === 0
                    ? { ...s, videoStartFrames: frames }
                    : s
            ));
        } catch (err: any) {
            setError(err.message || "Failed to generate video start frames.");
        } finally {
            setIsGeneratingFrames(false);
        }
    };
    reader.readAsDataURL(file);
  }

  const handleRegenerateFrame = async (index: number) => {
    if (!uploadedFrameBaseImage || !scenes[0]?.videoPrompts?.[index]) {
        setError("Cannot regenerate frame. Missing original image or prompt.");
        return;
    }
    setError(null);
    setRegeneratingFrameIndex(index);
    try {
        const videoPrompt = scenes[0].videoPrompts[index];
        const regeneratedFrame = await regenerateVideoStartFrame(uploadedFrameBaseImage, videoPrompt, index);
        
        setScenes(prev => prev.map((s, i) => {
            if (i !== 0) return s;
            return {
                ...s,
                videoStartFrames: s.videoStartFrames?.map((frame, frameIndex) =>
                    frameIndex === index ? regeneratedFrame : frame
                ),
            };
        }));
    } catch (err: any) {
        setError(err.message || `Failed to regenerate frame ${index + 1}.`);
    } finally {
        setRegeneratingFrameIndex(null);
    }
  };

  const handleDownloadFrame = (base64Data: string, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${base64Data}`;
    link.download = `start_frame_${index + 1}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFaceoffPresetChange = (preset: FaceoffPreset) => {
    setFaceoffPreset(preset);
    if (preset === 'land') {
        setAnimal1('Grizzly Bear');
        setAnimal2('Tiger');
        setBackground(initialBackgroundOptions[1]);
    } else {
        setAnimal1(initialSeaPredatorOptions[0]);
        setAnimal2(initialSeaPredatorOptions[1]);
        setBackground(initialSeaBackgroundOptions[0]);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'promptBuilder':
        return (
          <div className="space-y-6">
            <div>
                <label htmlFor="prompt-concept" className="block text-sm font-medium text-gray-400">Enter a simple concept</label>
                <textarea
                    id="prompt-concept"
                    value={promptConcept}
                    onChange={(e) => setPromptConcept(e.target.value)}
                    placeholder="e.g., A knight fighting a dragon in a volcano"
                    rows={3}
                    className="mt-2 w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
                />
            </div>
            <div>
                <label htmlFor="prompt-country" className="block text-sm font-medium text-gray-400">Country (Optional)</label>
                <input
                    id="prompt-country"
                    type="text"
                    value={promptBuilderCountry}
                    onChange={(e) => setPromptBuilderCountry(e.target.value)}
                    placeholder="e.g., South Korea, Japan, Ancient Rome"
                    className="mt-2 w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
                />
            </div>
          </div>
        );
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
      case 'friendship':
        const currentAnimalOptions = faceoffPreset === 'land' ? animal1Options : seaPredatorOptions;
        const currentBackgroundOptions = faceoffPreset === 'land' ? backgroundOptions : seaBackgroundOptions;
        return (
          <div className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Preset</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleFaceoffPresetChange('land')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors duration-200 ${
                            faceoffPreset === 'land' 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        Land Animals
                    </button>
                    <button
                        type="button"
                        onClick={() => handleFaceoffPresetChange('sea')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors duration-200 ${
                            faceoffPreset === 'sea' 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        Sea Animals
                    </button>
                </div>
            </div>
            <div>
              <label htmlFor="animal1-faceoff" className="block text-sm font-medium text-gray-400 mb-2">{activeTab === 'faceoff' ? 'Combatant 1' : 'Friend 1'}</label>
              <select id="animal1-faceoff" value={animal1} onChange={(e) => setAnimal1(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {currentAnimalOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="animal2-faceoff" className="block text-sm font-medium text-gray-400 mb-2">{activeTab === 'faceoff' ? 'Combatant 2' : 'Friend 2'}</label>
              <select id="animal2-faceoff" value={animal2} onChange={(e) => setAnimal2(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {currentAnimalOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="background-faceoff" className="block text-sm font-medium text-gray-400 mb-2">Background</label>
              <select id="background-faceoff" value={background} onChange={(e) => setBackground(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {currentBackgroundOptions.map(option => <option key={option} value={option}>{option}</option>)}
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
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Video Prompt Style</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setDeepSeaVideoStyle('cinematic')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors duration-200 ${
                            deepSeaVideoStyle === 'cinematic' 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        Cinematic
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeepSeaVideoStyle('selfie')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors duration-200 ${
                            deepSeaVideoStyle === 'selfie' 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        Selfie
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeepSeaVideoStyle('groupPhoto')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors duration-200 ${
                            deepSeaVideoStyle === 'groupPhoto' 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        Group Photo
                    </button>
                </div>
            </div>
          </div>
        );
      case 'fishing':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="trophyFish" className="block text-sm font-medium text-gray-400 mb-2">Trophy Fish</label>
              <select id="trophyFish" value={trophyFish} onChange={(e) => setTrophyFish(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {trophyFishOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="fishingBackground" className="block text-sm font-medium text-gray-400 mb-2">Background</label>
              <select id="fishingBackground" value={fishingBackground} onChange={(e) => setFishingBackground(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                {fishingBackgroundOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
        );
      case 'volleyball':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-400 mb-2">Country</label>
              <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                <option value="South Korea">South Korea</option>
                <option value="Japan">Japan</option>
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Framing</label>
                <div className="flex items-center gap-x-6">
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input type="radio" value="full body" checked={volleyballFraming === 'full body'} onChange={() => setVolleyballFraming('full body')} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                        <span className="ml-2">전체컷 (Full Body)</span>
                    </label>
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input type="radio" value="upper body" checked={volleyballFraming === 'upper body'} onChange={() => setVolleyballFraming('upper body')} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                        <span className="ml-2">상반신컷 (Upper Body)</span>
                    </label>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Stance</label>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {stanceOptions.map(option => (
                        <label key={option.value} className="flex items-center text-gray-300 cursor-pointer">
                            <input type="radio" value={option.value} checked={volleyballStance === option.value} onChange={() => setVolleyballStance(option.value)} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                            <span className="ml-2">{option.label}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
              <label htmlFor="volleyball-pose" className="block text-sm font-medium text-gray-400 mb-2">Pose / Action</label>
               <textarea
                id="volleyball-pose"
                value={volleyballPose}
                onChange={(e) => setVolleyballPose(e.target.value)}
                placeholder="e.g., executing a powerful jump spike"
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              />
            </div>
          </div>
        );
      case 'beachVolleyball':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="beach-country" className="block text-sm font-medium text-gray-400 mb-2">Country</label>
              <select id="beach-country" value={beachVolleyballCountry} onChange={(e) => setBeachVolleyballCountry(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                <option value="South Korea">South Korea</option>
                <option value="Japan">Japan</option>
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Framing</label>
                <div className="flex items-center gap-x-6">
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input type="radio" value="full body" checked={beachVolleyballFraming === 'full body'} onChange={() => setBeachVolleyballFraming('full body')} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                        <span className="ml-2">전체컷 (Full Body)</span>
                    </label>
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input type="radio" value="upper body" checked={beachVolleyballFraming === 'upper body'} onChange={() => setBeachVolleyballFraming('upper body')} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                        <span className="ml-2">상반신컷 (Upper Body)</span>
                    </label>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Stance</label>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {stanceOptions.map(option => (
                        <label key={option.value} className="flex items-center text-gray-300 cursor-pointer">
                            <input type="radio" value={option.value} checked={beachVolleyballStance === option.value} onChange={() => setBeachVolleyballStance(option.value)} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                            <span className="ml-2">{option.label}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
              <label htmlFor="beach-volleyball-pose" className="block text-sm font-medium text-gray-400 mb-2">Pose / Action</label>
               <textarea
                id="beach-volleyball-pose"
                value={beachVolleyballPose}
                onChange={(e) => setBeachVolleyballPose(e.target.value)}
                placeholder="e.g., diving for a dig in the sand"
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              />
            </div>
          </div>
        );
      case 'swimming':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="swimming-country" className="block text-sm font-medium text-gray-400 mb-2">Country</label>
              <select id="swimming-country" value={swimmingCountry} onChange={(e) => setSwimmingCountry(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                <option value="South Korea">South Korea</option>
                <option value="Japan">Japan</option>
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Framing</label>
                <div className="flex items-center gap-x-6">
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input type="radio" value="full body" checked={swimmingFraming === 'full body'} onChange={() => setSwimmingFraming('full body')} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                        <span className="ml-2">전체컷 (Full Body)</span>
                    </label>
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input type="radio" value="upper body" checked={swimmingFraming === 'upper body'} onChange={() => setSwimmingFraming('upper body')} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                        <span className="ml-2">상반신컷 (Upper Body)</span>
                    </label>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Stance</label>
                 <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {stanceOptions.map(option => (
                        <label key={option.value} className="flex items-center text-gray-300 cursor-pointer">
                            <input type="radio" value={option.value} checked={swimmingStance === option.value} onChange={() => setSwimmingStance(option.value)} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                            <span className="ml-2">{option.label}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
              <label htmlFor="swimming-action" className="block text-sm font-medium text-gray-400 mb-2">Pose / Action</label>
               <textarea
                id="swimming-action"
                value={swimmingAction}
                onChange={(e) => setSwimmingAction(e.target.value)}
                placeholder="e.g., diving off the starting block"
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              />
            </div>
          </div>
        );
      case 'track':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="track-country" className="block text-sm font-medium text-gray-400 mb-2">Country</label>
              <select id="track-country" value={trackCountry} onChange={(e) => setTrackCountry(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white">
                <option value="South Korea">South Korea</option>
                <option value="Japan">Japan</option>
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Framing</label>
                <div className="flex items-center gap-x-6">
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input type="radio" value="full body" checked={trackFraming === 'full body'} onChange={() => setTrackFraming('full body')} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                        <span className="ml-2">전체컷 (Full Body)</span>
                    </label>
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input type="radio" value="upper body" checked={trackFraming === 'upper body'} onChange={() => setTrackFraming('upper body')} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                        <span className="ml-2">상반신컷 (Upper Body)</span>
                    </label>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Stance</label>
                 <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {stanceOptions.map(option => (
                        <label key={option.value} className="flex items-center text-gray-300 cursor-pointer">
                            <input type="radio" value={option.value} checked={trackStance === option.value} onChange={() => setTrackStance(option.value)} className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 focus:ring-indigo-500 focus:ring-2" />
                            <span className="ml-2">{option.label}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
              <label htmlFor="track-action" className="block text-sm font-medium text-gray-400 mb-2">Pose / Action</label>
               <textarea
                id="track-action"
                value={trackAction}
                onChange={(e) => setTrackAction(e.target.value)}
                placeholder="e.g., sprinting out of the starting blocks"
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              />
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
      case 'analyze2':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-400">Paste Image to Analyze</label>
            <div
              onPaste={handlePaste}
              tabIndex={0}
              className="relative w-full h-48 bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-center p-4 text-gray-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-500 hover:bg-gray-700 transition-all duration-200"
            >
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Analyzing...</span>
                </div>
              ) : thumbnailBase64 ? (
                <img src={`data:image/jpeg;base64,${thumbnailBase64}`} alt="Pasted content" className="max-h-full max-w-full object-contain rounded-md" />
              ) : (
                <span>Click here and paste image from clipboard<br/>(Ctrl+V or Cmd+V)</span>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getTabClass = (tabName: Tab) => `whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none ${activeTab === tabName ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'}`;

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
            <div className="border-b border-gray-700 px-4 pt-4 pb-2">
                <nav className="flex flex-wrap gap-2" aria-label="Tabs">
                <button onClick={() => handleTabChange('promptBuilder')} className={getTabClass('promptBuilder')}>Prompt Builder</button>
                <button onClick={() => handleTabChange('celebration')} className={getTabClass('celebration')}>Celebration</button>
                <button onClick={() => handleTabChange('faceoff')} className={getTabClass('faceoff')}>Face-off</button>
                <button onClick={() => handleTabChange('friendship')} className={getTabClass('friendship')}>Friendship</button>
                <button onClick={() => handleTabChange('selfie')} className={getTabClass('selfie')}>Selfie</button>
                <button onClick={() => handleTabChange('volleyball')} className={getTabClass('volleyball')}>배구선수 생성</button>
                <button onClick={() => handleTabChange('beachVolleyball')} className={getTabClass('beachVolleyball')}>비치발리볼 선수 생성</button>
                <button onClick={() => handleTabChange('swimming')} className={getTabClass('swimming')}>수영선수 생성</button>
                <button onClick={() => handleTabChange('track')} className={getTabClass('track')}>육상선수 생성</button>
                <button onClick={() => handleTabChange('fishing')} className={getTabClass('fishing')}>Fishing</button>
                <button onClick={() => handleTabChange('deepsea')} className={getTabClass('deepsea')}>Deep Sea</button>
                <button onClick={() => handleTabChange('analyze')} className={getTabClass('analyze')}>Analyze URL</button>
                <button onClick={() => handleTabChange('analyze2')} className={getTabClass('analyze2')}>Analyze URL2</button>
                </nav>
            </div>

            <div className="p-6">
                {renderTabContent()}

                {activeTab === 'promptBuilder' && (
                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <button
                        onClick={handleGenerateBuilderPrompts}
                        disabled={isBuildingPrompt}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                        >
                            <SparklesIcon className="h-5 w-5" />
                            {isBuildingPrompt ? 'Generating...' : 'Generate All Prompts'}
                        </button>
                    </div>
                )}


                {activeTab !== 'analyze' && activeTab !== 'analyze2' && activeTab !== 'promptBuilder' && (
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

        {(isGenerating || isAnalyzing || isBuildingPrompt) && (
            <div className="mt-8 flex justify-center">
                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        )}

        {error && (
            <div className="mt-8 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
        
        {activeTab === 'promptBuilder' && promptBuilderResult && !isBuildingPrompt && (
          <div className="mt-12 space-y-10">
              <CopyableField title="Generated Image Prompt" content={promptBuilderResult.imagePrompt} />
              <CopyableField title="Generated Video Prompt" content={promptBuilderResult.videoPrompt} />
              <CopyableField 
                  title="YouTube Shorts Title & Description" 
                  content={`---\n${promptBuilderResult.englishTitle} ${promptBuilderResult.japaneseTitle}\n${promptBuilderResult.tags}\n\n${promptBuilderResult.englishDescription}\n\n${promptBuilderResult.japaneseDescription}`}
                  variant="meta" 
                  displayAsCode 
              />
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
                                content={`${youtubeMeta.en.title} ${youtubeMeta.jp.title}\n${youtubeMeta.tags}\n\n${youtubeMeta.en.description}\n\n${youtubeMeta.jp.description}`}
                                variant="meta" 
                                displayAsCode
                            />
                        </div>
                    </div>
                )}

                {thumbnailBase64 && (
                    <div className="space-y-4 text-center">
                         <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">Analyzed Image</h3>
                        <img src={`data:image/jpeg;base64,${thumbnailBase64}`} alt="YouTube Short Thumbnail" className="rounded-lg shadow-lg mx-auto border-4 border-gray-700"/>
                    </div>
                )}

                {scenes.map((scene, index) => (
                    <div key={index} className="space-y-6">
                        <h3 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">Scene {index + 1}</h3>
                        <div className="grid grid-cols-1 gap-6">
                            <CopyableField title="Image Prompt" content={scene.imagePrompt} />
                            {scene.videoPrompt && <CopyableField title="Video Prompt" content={scene.videoPrompt} />}
                            {scene.videoPrompts && scene.videoPrompts.map((vp, i) => (
                              <CopyableField key={i} title={`Video Prompt ${i + 1}`} content={vp} />
                            ))}
                        </div>
                        
                        {activeTab !== 'analyze' && activeTab !== 'analyze2' && (
                            <div className="mt-8 pt-8 border-t border-gray-700 text-center">
                                <button
                                    onClick={() => handleGenerateImageVariations(index)}
                                    disabled={isGeneratingImages}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                                >
                                    <SparklesIcon className={`h-5 w-5 ${isGeneratingImages ? 'animate-spin' : ''}`} />
                                    {isGeneratingImages ? 'Generating Images...' : 'Generate Image Variations'}
                                </button>
                            </div>
                        )}

                        {scene.generatedImages && scene.generatedImages.length > 0 && (
                            <div className="mt-10">
                                <h4 className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-6">Generated Images</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {scene.generatedImages.map((image, imgIndex) => (
                                        <div key={imgIndex} className="space-y-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                            <img src={`data:image/jpeg;base64,${image.imageBase64}`} alt={`Generated variation ${imgIndex + 1}`} className="rounded-lg shadow-md w-full" />
                                            <div className="space-y-3">
                                                {!image.videoPrompt && (
                                                    <button
                                                        onClick={() => handleGenerateVideoPromptForImage(index, imgIndex)}
                                                        disabled={image.isGeneratingVideoPrompt}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <SparklesIcon className={`h-5 w-5 ${image.isGeneratingVideoPrompt ? 'animate-spin' : ''}`} />
                                                        {image.isGeneratingVideoPrompt ? 'Generating...' : 'Generate Video Prompt'}
                                                    </button>
                                                )}
                                                {image.videoPrompt && (
                                                    <CopyableField title={`Video Prompt for Image ${imgIndex + 1}`} content={image.videoPrompt} />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                ))}

                {activeTab === 'analyze2' && scenes.length > 0 && !scenes[0].videoStartFrames && (
                  <div className="mt-8 pt-8 border-t border-gray-700 text-center">
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Generate Video Start Frames</h3>
                    <p className="mt-2 text-gray-400 max-w-2xl mx-auto">Use the image prompt above to create an image with your preferred tool. Then, upload it here to generate consistent starting frames for each video prompt.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => frameFileInputRef.current?.click()}
                        disabled={isGeneratingFrames}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                      >
                        <UploadIcon className="h-5 w-5"/>
                        {isGeneratingFrames ? 'Generating Frames...' : 'Upload Your Image'}
                      </button>
                    </div>
                  </div>
                )}
                
                {activeTab === 'analyze2' && scenes[0]?.videoStartFrames && uploadedFrameBaseImage && (
                  <div className="mt-12 space-y-10">
                      <div className="space-y-4 text-center">
                         <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">Your Uploaded Image</h3>
                        <img src={`data:image/jpeg;base64,${uploadedFrameBaseImage}`} alt="User uploaded base for frames" className="rounded-lg shadow-lg mx-auto border-4 border-gray-700 w-1/2"/>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-8">Generated Video Start Frames</h3>
                      <div className="space-y-8">
                        {scenes[0].videoStartFrames.map((frame, index) => (
                           <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                              <div className="relative">
                                <img src={`data:image/jpeg;base64,${frame.imageBase64}`} alt={`Generated start frame ${index + 1}`} className="rounded-lg shadow-md w-full" />
                              </div>
                              <div className="flex flex-col justify-between h-full gap-4">
                                <CopyableField title={`For Video Prompt ${index + 1}`} content={frame.prompt} />
                                <div className="flex gap-2 self-start">
                                  <button
                                      onClick={() => handleRegenerateFrame(index)}
                                      disabled={isGeneratingFrames || regeneratingFrameIndex !== null}
                                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      aria-label={`Regenerate image for video prompt ${index + 1}`}
                                  >
                                      <RefreshIcon className={`h-5 w-5 ${regeneratingFrameIndex === index ? 'animate-spin' : ''}`} />
                                      {regeneratingFrameIndex === index ? 'Regenerating...' : 'Regenerate'}
                                  </button>
                                  <button
                                    onClick={() => handleDownloadFrame(frame.imageBase64, index)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
                                    aria-label={`Download image for video prompt ${index + 1}`}
                                  >
                                      <DownloadIcon className="h-5 w-5" />
                                      Download
                                  </button>
                                </div>
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                />
                 <input
                    type="file"
                    ref={frameFileInputRef}
                    onChange={handleImageUploadForFrames}
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