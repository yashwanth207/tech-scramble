/* ---------- Shared Quiz Types & Seed Data (Client & Server Safe) ---------- */

export interface StoredSet {
  id: string;
  name: string;
}

export interface StoredRound {
  id: string;
  name: string;
}

export interface StoredQuestion {
  id: string;
  setId: string;
  roundId: string;
  text: string;
  answer: string;
  marks: number;
  timer: number;
  imageUrl: string;
  options?: string[];
  targetWord?: string;
  tabooWords?: string[];
  emojiClue?: string;
  cardReference?: string;
  flaggedForReview?: boolean;
  reviewNotes?: string;
}

export interface StoredQuiz {
  sets: StoredSet[];
  rounds: StoredRound[];
  questions: StoredQuestion[];
  unassignedQuestions?: StoredQuestion[];
}

export interface TeamSubmission {
  id: string;
  teamName: string;
  setId: string;
  roundId: string;
  questionId: string;
  answer: string;
  correct: boolean;
  points: number;
  submittedAt: string;
}

export interface ManualScoreAward {
  id: string;
  teamName: string;
  roundId: string;
  points: number;
  reason: string;
  awardedAt: string;
}

export interface LiveGameState {
  activeSetId: string;
  activeRoundId: string;
  currentQuestionIndex: number;
  timerRunning: boolean;
  isAnswerRevealed: boolean;
  updatedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  setId: string;
  setName: string;
  roundScores: Record<string, number>;
  totalScore: number;
  questionsAnswered: number;
  lastActive: string;
}

/* ---------- Canonical Round Names ---------- */

export const ROUND_1_NAME = "guess the tech word";
export const ROUND_2_NAME = "air or real";
export const ROUND_3_NAME = "tech taboo";

// Legacy aliases for backward compatibility
export const IMAGE_ROUND_NAME = "air or real";
export const TABOO_ROUND_NAME = "tech taboo";
export const TIKTOK_ROUND_NAME = "guess the tech word";

export const INITIAL_SETS: StoredSet[] = [
  { id: "s1", name: "Alpha" },
  { id: "s2", name: "Beta" },
  { id: "s3", name: "Gamma" },
  { id: "s4", name: "Delta" },
];

export const INITIAL_ROUNDS: StoredRound[] = [
  { id: "r1", name: "Guess the Tech Word" },
  { id: "r2", name: "Air or Real" },
  { id: "r3", name: "Tech Taboo" },
];

/* ---------- Official Source Question Banks ---------- */

/** Round 1 — 25 Tech Word Question Items */
export interface TechWordItem {
  number: number;
  question: string;
  targetWord: string;
  accepted: string;
  imageUrl?: string;
}

export const TECH_WORD_SOURCE: TechWordItem[] = [
  { number: 1, question: "Identify the core foundation technology representing human-like machine intelligence:", targetWord: "Artificial Intelligence", accepted: "Artificial Intelligence|AI" },
  { number: 2, question: "Identify the image-generation neural network model that renders artwork from text prompts:", targetWord: "Diffusion Model", accepted: "Diffusion Model|DALL-E|DALLE|Midjourney|Stable Diffusion|Image Generator" },
  { number: 3, question: "Identify this conversational AI agent designed to interactively answer queries in natural dialogue:", targetWord: "Chatbot", accepted: "Chatbot|ChatGPT|Conversational AI|AI Assistant" },
  { number: 4, question: "Identify the AI research organization founded in 2015 that developed GPT-4 and ChatGPT:", targetWord: "OpenAI", accepted: "OpenAI" },
  { number: 5, question: "Identify the primary hardware chip serving as the brain of an autonomous robotic controller:", targetWord: "CPU", accepted: "CPU|Processor|Central Processing Unit|Microcontroller" },
  { number: 6, question: "Identify the scientific computational field where systems automatically learn patterns from data without explicit rules:", targetWord: "Machine Learning", accepted: "Machine Learning|ML" },
  { number: 7, question: "Identify the specialized AI domain dedicated to reading, deciphering, and translating human languages:", targetWord: "Natural Language Processing", accepted: "Natural Language Processing|NLP" },
  { number: 8, question: "Identify the technology allowing computers and self-driving vehicles to perceive and process visual images:", targetWord: "Computer Vision", accepted: "Computer Vision|CV" },
  { number: 9, question: "Identify the test formulated in 1950 to evaluate if a machine can demonstrate indistinguishable human intelligence:", targetWord: "Turing Test", accepted: "Turing Test|Turing" },
  { number: 10, question: "Identify the interconnected computational architecture modelled directly after biological neurons in the human brain:", targetWord: "Neural Network", accepted: "Neural Network|Neural Net|ANN|Deep Neural Network" },
  { number: 11, question: "Identify the parallel computing processor hardware originally engineered for graphics and now essential for AI training:", targetWord: "GPU", accepted: "GPU|Graphics Processing Unit" },
  { number: 12, question: "Identify this historical supercomputer developed by IBM that defeated world chess champion Garry Kasparov in 1997:", targetWord: "Deep Blue", accepted: "Deep Blue|IBM Deep Blue" },
  { number: 13, question: "Identify the machine learning paradigm where an intelligent agent learns optimal actions via trial-and-error rewards:", targetWord: "Reinforcement Learning", accepted: "Reinforcement Learning|RL" },
  { number: 14, question: "Identify the term for hyper-realistic synthetic media where a person's likeness or voice is digitally swapped:", targetWord: "Deepfake", accepted: "Deepfake|Deep Fake|Face Swap" },
  { number: 15, question: "Identify the breakthrough reinforcement learning system created by Google DeepMind that defeated Go world champion Lee Sedol:", targetWord: "AlphaGo", accepted: "AlphaGo|Alpha Go" },
  { number: 16, question: "Identify this self-navigating transportation technology that drives without human intervention using sensors and AI:", targetWord: "Autonomous Vehicle", accepted: "Autonomous Vehicle|Self-Driving Car|Autonomous|Self Driving" },
  { number: 17, question: "Identify the hypothetical milestone where an artificial agent matches human intellectual abilities across any cognitive task:", targetWord: "AGI", accepted: "AGI|Artificial General Intelligence" },
  { number: 18, question: "Identify the cloud-based voice assistant ecosystem developed and deployed by Amazon in Echo devices:", targetWord: "Alexa", accepted: "Alexa|Amazon Alexa" },
  { number: 19, question: "Identify Google's flagship multimodal generative AI model family and assistant:", targetWord: "Gemini", accepted: "Gemini|Google Gemini|Bard" },
  { number: 20, question: "Identify the iOS and macOS built-in voice-controlled intelligent personal assistant:", targetWord: "Siri", accepted: "Siri|Apple Siri" },
  { number: 21, question: "Identify the IBM cognitive question-answering computer system that won Jeopardy! in 2011 against human champions:", targetWord: "Watson", accepted: "Watson|IBM Watson" },
  { number: 22, question: "Identify the natural language input command or instructions given to guide generative AI outputs:", targetWord: "Prompt", accepted: "Prompt|Prompt Engineering|Input" },
  { number: 23, question: "Identify the ultra-high-performance clustered computing machines used to train frontier foundation models:", targetWord: "Supercomputer", accepted: "Supercomputer|HPC|Super Computer" },
  { number: 24, question: "Identify the optical technology that converts typed, handwritten, or printed text scans into machine-readable digital text:", targetWord: "OCR", accepted: "OCR|Optical Character Recognition" },
  { number: 25, question: "Identify the phenomenon when a generative language model confidently outputs false or fabricated facts:", targetWord: "Hallucination", accepted: "Hallucination|AI Hallucination|Confabulation" },
];

/** Round 2 — 30 Air or Real Items (AI-Generated vs Real) */
export interface AirOrRealItem {
  number: number;
  text: string;
  answer: "AI-Generated" | "Real";
  imageUrl?: string;
}

export const AIR_OR_REAL_SOURCE: AirOrRealItem[] = [
  { number: 1, text: "A hyper-detailed portrait of a robotic cat with glowing fiber-optic whiskers sitting on a motherboard.", answer: "AI-Generated" },
  { number: 2, text: "An aerial photograph of a server warehouse in Oregon cooled with natural river mist.", answer: "Real" },
  { number: 3, text: "An ancient Greek marble bust carved holding a 1984 Apple Macintosh computer.", answer: "AI-Generated" },
  { number: 4, text: "A close-up macro photograph of a silicon wafer reflecting iridescent rainbow diffraction patterns.", answer: "Real" },
  { number: 5, text: "A bustling futuristic Tokyo night market where vendors sell holographic street food under neon rain.", answer: "AI-Generated" },
  { number: 6, text: "A snapshot of the Apollo 11 guidance computer rope memory being hand-woven by seamstresses in 1969.", answer: "Real" },
  { number: 7, text: "A photorealistic render of an astronaut skateboarding down the rings of Saturn.", answer: "AI-Generated" },
  { number: 8, text: "A high-speed photo of a fiber-optic cable laser pulse illuminating liquid nitrogen vapor in a laboratory.", answer: "Real" },
  { number: 9, text: "A Victorian-era laboratory with steam-powered brass vacuum tube quantum processors.", answer: "AI-Generated" },
  { number: 10, text: "The original wooden computer mouse prototype invented by Douglas Engelbart in 1964 with two metal wheels.", answer: "Real" },
  { number: 11, text: "A glowing underwater data center submerged in translucent coral reefs with luminescent jellyfish.", answer: "AI-Generated" },
  { number: 12, text: "A cleanroom technician in a yellow bunny suit inspecting an ASML extreme ultraviolet lithography machine.", answer: "Real" },
  { number: 13, text: "A stained glass cathedral window portraying Ada Lovelace and Alan Turing surrounded by binary halos.", answer: "AI-Generated" },
  { number: 14, text: "An infrared satellite photograph of Google's solar panel server farm in the Mojave Desert.", answer: "Real" },
  { number: 15, text: "A photorealistic cybernetic hummingbird pollinating metallic solar flower microcircuits.", answer: "AI-Generated" },
  { number: 16, text: "The interior cabling spaghetti of the 1946 ENIAC computer at the University of Pennsylvania.", answer: "Real" },
  { number: 17, text: "A futuristic coffee barista robot pouring foam latte art in the exact shape of the Linux penguin Tux.", answer: "AI-Generated" },
  { number: 18, text: "An electron microscope image of a microscopic gear train etched on a micro-electromechanical chip (MEMS).", answer: "Real" },
  { number: 19, text: "A golden retriever wearing VR goggles and typing furiously on a mechanical split ergonomic keyboard.", answer: "AI-Generated" },
  { number: 20, text: "The magnetic core memory plane from a 1960s IBM System/360 mainframe.", answer: "Real" },
  { number: 21, text: "A floating cloud city with towering quantum antenna spires above a sunset atmosphere.", answer: "AI-Generated" },
  { number: 22, text: "The deep sea submarine cable laying ship CS Long Lines spooling transatlantic fiber optic communications cable.", answer: "Real" },
  { number: 23, text: "A Renaissance oil painting depicting Steve Jobs and Bill Gates disputing a graphical user interface.", answer: "AI-Generated" },
  { number: 24, text: "Rocky tropical coastline cliff with crashing ocean waves, palms, and crystal clear sea spray.", answer: "Real", imageUrl: "/air-or-real/coast-cliff-24.png" },
  { number: 25, text: "Rain-strewn windowsill overlooking lush green foliage with an open paper novel and hot ceramic mug.", answer: "Real", imageUrl: "/air-or-real/rainy-window-25.png" },
  { number: 26, text: "The Cray-1 supercomputer horseshoe-shaped cooling bench installed at Los Alamos National Laboratory in 1976.", answer: "Real" },
  { number: 27, text: "A photorealistic human eye where the iris is an intricate spinning clockwork CPU socket.", answer: "AI-Generated" },
  { number: 28, text: "The Voyager 1 Golden Record with its etched phonograph instructions floating against interstellar space.", answer: "Real" },
  { number: 29, text: "A drone shot of an overgrown Mayan temple reclaimed by sentient cybernetic glowing vines.", answer: "AI-Generated" },
  { number: 30, text: "The CERN Large Hadron Collider particle detector cavern during maintenance with its giant toroidal magnets.", answer: "Real" },
];

/** Round 3 — 30 Tech Taboo Cards from chat screenshots */
export interface TechTabooItem {
  number: number;
  targetWord: string;
  tabooWords: string[];
  cardReference: string;
  flaggedForReview?: boolean;
  reviewNotes?: string;
}

export const TECH_TABOO_SOURCE: TechTabooItem[] = [
  { number: 1, targetWord: "Keyboard", tabooWords: ["keys", "type", "computer", "letters"], cardReference: "/taboo/card-1.jpg" },
  { number: 2, targetWord: "Mouse", tabooWords: ["click", "cursor", "computer", "scroll"], cardReference: "/taboo/card-2.jpg" },
  { number: 3, targetWord: "Webcam", tabooWords: ["camera", "video", "laptop", "call"], cardReference: "/taboo/card-3.jpg" },
  { number: 4, targetWord: "Headphones", tabooWords: ["ears", "music", "sound", "listen"], cardReference: "/taboo/card-4.jpg" },
  { number: 5, targetWord: "Touchscreen", tabooWords: ["touch", "finger", "phone", "display"], cardReference: "/taboo/card-5.jpg" },
  { number: 6, targetWord: "Projector", tabooWords: ["screen", "presentation", "display", "light"], cardReference: "/taboo/card-6.jpg" },
  { number: 7, targetWord: "Microphone", tabooWords: ["voice", "sound", "audio", "speak"], cardReference: "/taboo/card-7.jpg" },
  { number: 8, targetWord: "Smartwatch", tabooWords: ["watch", "wrist", "time", "fitness"], cardReference: "/taboo/card-8.jpg" },
  { number: 9, targetWord: "Algorithm", tabooWords: ["steps", "instructions", "problem", "code"], cardReference: "/taboo/card-9.jpg" },
  { number: 10, targetWord: "Debugging", tabooWords: ["error", "fix", "code", "bug"], cardReference: "/taboo/card-10.jpg" },
  { number: 11, targetWord: "Compiler", tabooWords: ["code", "translate", "program", "language"], cardReference: "/taboo/card-11.jpg" },
  { number: 12, targetWord: "Programming", tabooWords: ["code", "software", "developer", "language"], cardReference: "/taboo/card-12.jpg" },
  { number: 13, targetWord: "GitHub", tabooWords: ["repository", "code", "Git", "developer"], cardReference: "/taboo/card-13.jpg" },
  { number: 14, targetWord: "API", tabooWords: ["application", "interface", "request", "software"], cardReference: "/taboo/card-14.jpg" },
  {
    number: 15,
    targetWord: "HTML",
    tabooWords: ["website", "tags", "webpage", "browser"],
    cardReference: "/taboo/card-15.jpg",
    flaggedForReview: true,
    reviewNotes: "Row 15 (HTML) 4th forbidden word was cropped in original screenshot ('website, tags, webpage,...'). Marked for admin review.",
  },
  { number: 16, targetWord: "CSS", tabooWords: ["style", "design", "website", "color"], cardReference: "/taboo/card-16.jpg" },
  { number: 17, targetWord: "JavaScript", tabooWords: ["browser", "web", "code", "programming"], cardReference: "/taboo/card-17.jpg" },
  { number: 18, targetWord: "SQL", tabooWords: ["database", "query", "table", "data"], cardReference: "/taboo/card-18.jpg" },
  { number: 19, targetWord: "Linux", tabooWords: ["operating system", "penguin", "terminal", "open-source"], cardReference: "/taboo/card-19.jpg" },
  { number: 20, targetWord: "Android", tabooWords: ["Google", "phone", "mobile", "operating system"], cardReference: "/taboo/card-20.jpg" },
  { number: 21, targetWord: "iOS", tabooWords: ["Apple", "iPhone", "mobile", "operating system"], cardReference: "/taboo/card-21.jpg" },
  { number: 22, targetWord: "Virtual Assistant", tabooWords: ["Siri", "Alexa", "voice", "help"], cardReference: "/taboo/card-22.jpg" },
  { number: 23, targetWord: "Streaming", tabooWords: ["video", "live", "Netflix", "online"], cardReference: "/taboo/card-23.jpg" },
  { number: 24, targetWord: "Podcast", tabooWords: ["audio", "episode", "microphone", "show"], cardReference: "/taboo/card-24.jpg" },
  { number: 25, targetWord: "Meme", tabooWords: ["funny", "internet", "image", "viral"], cardReference: "/taboo/card-25.jpg" },
  { number: 26, targetWord: "Hashtag", tabooWords: ["symbol", "social media", "trend", "#"], cardReference: "/taboo/card-26.jpg" },
  { number: 27, targetWord: "Phishing", tabooWords: ["email", "scam", "fraud", "link"], cardReference: "/taboo/card-27.jpg" },
  { number: 28, targetWord: "Ransomware", tabooWords: ["files", "money", "attack", "hacker"], cardReference: "/taboo/card-28.jpg" },
  { number: 29, targetWord: "Spam", tabooWords: ["unwanted", "email", "junk", "messages"], cardReference: "/taboo/card-29.jpg" },
  { number: 30, targetWord: "CAPTCHA", tabooWords: ["robot", "human", "verification", "website"], cardReference: "/taboo/card-30.jpg" },
];

/**
 * Builds the canonical quiz structure:
 * - Exactly 4 sets: Alpha, Beta, Gamma, Delta
 * - Exactly 3 rounds: Guess the Tech Word, Air or Real, Tech Taboo
 * - Exactly 5 questions per round per set (60 assigned questions total)
 * - Questions 1–5 -> Alpha, 6–10 -> Beta, 11–15 -> Gamma, 16–20 -> Delta
 * - Remaining items (R1: 21–25, R2: 21–30, R3: 21–30) preserved in unassignedQuestions
 */
export function buildDefaultQuiz(): StoredQuiz {
  const sets = INITIAL_SETS;
  const rounds = INITIAL_ROUNDS;
  const questions: StoredQuestion[] = [];
  const unassignedQuestions: StoredQuestion[] = [];

  sets.forEach((set, setIndex) => {
    const startIdx = setIndex * 5;

    // Round 1: Guess the Tech Word (5 items)
    for (let i = 0; i < 5; i++) {
      const item = TECH_WORD_SOURCE[startIdx + i];
      questions.push({
        id: `q-${set.id}-r1-${i + 1}`,
        setId: set.id,
        roundId: "r1",
        text: item.question,
        answer: item.accepted,
        marks: 10,
        timer: 30,
        imageUrl: item.imageUrl ?? "",
        targetWord: item.targetWord,
      });
    }

    // Round 2: Air or Real (5 items, options: ["AI-Generated", "Real"])
    for (let i = 0; i < 5; i++) {
      const item = AIR_OR_REAL_SOURCE[startIdx + i];
      questions.push({
        id: `q-${set.id}-r2-${i + 1}`,
        setId: set.id,
        roundId: "r2",
        text: item.text,
        answer: item.answer,
        marks: 10,
        timer: 30,
        imageUrl: item.imageUrl ?? "",
        options: ["AI-Generated", "Real"],
      });
    }

    // Round 3: Tech Taboo (5 items)
    for (let i = 0; i < 5; i++) {
      const item = TECH_TABOO_SOURCE[startIdx + i];
      questions.push({
        id: `q-${set.id}-r3-${i + 1}`,
        setId: set.id,
        roundId: "r3",
        text: `Describe "${item.targetWord}" without saying any of the forbidden words!`,
        answer: item.targetWord,
        marks: 15,
        timer: 60,
        imageUrl: item.cardReference,
        cardReference: item.cardReference,
        targetWord: item.targetWord,
        tabooWords: item.tabooWords,
        flaggedForReview: item.flaggedForReview,
        reviewNotes: item.reviewNotes,
      });
    }
  });

  // Preserve unassigned items in the Unassigned Question Bank
  // R1 items 21–25
  for (let i = 20; i < TECH_WORD_SOURCE.length; i++) {
    const item = TECH_WORD_SOURCE[i];
    unassignedQuestions.push({
      id: `q-unassigned-r1-${item.number}`,
      setId: "unassigned",
      roundId: "r1",
      text: item.question,
      answer: item.accepted,
      marks: 10,
      timer: 30,
      imageUrl: item.imageUrl ?? "",
      targetWord: item.targetWord,
    });
  }

  // R2 items 21–30
  for (let i = 20; i < AIR_OR_REAL_SOURCE.length; i++) {
    const item = AIR_OR_REAL_SOURCE[i];
    unassignedQuestions.push({
      id: `q-unassigned-r2-${item.number}`,
      setId: "unassigned",
      roundId: "r2",
      text: item.text,
      answer: item.answer,
      marks: 10,
      timer: 30,
      imageUrl: item.imageUrl ?? "",
      options: ["AI-Generated", "Real"],
    });
  }

  // R3 items 21–30
  for (let i = 20; i < TECH_TABOO_SOURCE.length; i++) {
    const item = TECH_TABOO_SOURCE[i];
    unassignedQuestions.push({
      id: `q-unassigned-r3-${item.number}`,
      setId: "unassigned",
      roundId: "r3",
      text: `Describe "${item.targetWord}" without saying any of the forbidden words!`,
      answer: item.targetWord,
      marks: 15,
      timer: 60,
      imageUrl: item.cardReference,
      cardReference: item.cardReference,
      targetWord: item.targetWord,
      tabooWords: item.tabooWords,
      flaggedForReview: item.flaggedForReview,
      reviewNotes: item.reviewNotes,
    });
  }

  return { sets, rounds, questions, unassignedQuestions };
}
