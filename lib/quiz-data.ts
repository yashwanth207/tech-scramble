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

/* ---------- Canonical Round & Set Constants ---------- */

export const ROUND_1_NAME = "ai quick q&a";
export const ROUND_2_NAME = "emoji tech guess";
export const ROUND_3_NAME = "tech taboo";

// Legacy aliases for backward compatibility
export const IMAGE_ROUND_NAME = "emoji tech guess";
export const TABOO_ROUND_NAME = "tech taboo";
export const TIKTOK_ROUND_NAME = "ai quick q&a";

export const INITIAL_SETS: StoredSet[] = [
  { id: "s1", name: "Alpha" },
  { id: "s2", name: "Beta" },
  { id: "s3", name: "Gamma" },
  { id: "s4", name: "Delta" },
];

export const INITIAL_ROUNDS: StoredRound[] = [
  { id: "r1", name: "AI Quick Q&A" },
  { id: "r2", name: "Emoji Tech Guess" },
  { id: "r3", name: "Tech Taboo" },
];

/* ---------- Official Source Question Banks ---------- */

/** Round 1 — 25 Simple AI Questions from "25_Simple_AI_OneWord_QA" */
export interface AiQaItem {
  number: number;
  question: string;
  answer: string;
  accepted: string;
}

export const AI_QA_SOURCE: AiQaItem[] = [
  { number: 1, question: "What does AI stand for?", answer: "Artificial Intelligence", accepted: "Artificial Intelligence|AI" },
  { number: 2, question: "Which AI model makes images from text?", answer: "Image generator", accepted: "Image generator|Text to image|Diffusion model|Diffusion" },
  { number: 3, question: "What is ChatGPT?", answer: "Chatbot", accepted: "Chatbot|AI chatbot|Conversational AI" },
  { number: 4, question: "Which company created ChatGPT?", answer: "OpenAI", accepted: "OpenAI" },
  { number: 5, question: "What is a robot's brain often called?", answer: "Controller", accepted: "Controller|Microcontroller|CPU|Processor" },
  { number: 6, question: "What is machine learning?", answer: "Learning", accepted: "Learning|Machine learning|ML" },
  { number: 7, question: "What does NLP stand for?", answer: "Natural Language Processing", accepted: "Natural Language Processing|NLP" },
  { number: 8, question: "What does computer vision help computers understand?", answer: "Images", accepted: "Images|Image|Pictures|Visuals" },
  { number: 9, question: "What is a chatbot?", answer: "Assistant", accepted: "Assistant|Virtual assistant|Bot|Chatbot" },
  { number: 10, question: "What is a prompt?", answer: "Instruction", accepted: "Instruction|Query|Prompt|Input" },
  { number: 11, question: "What is data?", answer: "Information", accepted: "Information|Data" },
  { number: 12, question: "What is an algorithm?", answer: "Procedure", accepted: "Procedure|Instructions|Steps|Formula" },
  { number: 13, question: "What does AI use to learn patterns?", answer: "Data", accepted: "Data|Dataset|Datasets" },
  { number: 14, question: "What is speech recognition?", answer: "Transcription", accepted: "Transcription|Speech to text|STT" },
  { number: 15, question: "What does OCR read?", answer: "Text", accepted: "Text|Characters|Words" },
  { number: 16, question: "What is a neural network inspired by?", answer: "Brain", accepted: "Brain|Human brain|Neurons" },
  { number: 17, question: "What is a self-driving car designed to do?", answer: "Drive", accepted: "Drive|Navigate|Steer|Drive autonomously" },
  { number: 18, question: "Which AI technology can create realistic speech?", answer: "Voice synthesis", accepted: "Voice synthesis|Text to speech|TTS|Speech synthesis" },
  { number: 19, question: "What is a hallucination in AI?", answer: "Fabrication", accepted: "Fabrication|False information|Error|Hallucination" },
  { number: 20, question: "What does training an AI mean?", answer: "Learning", accepted: "Learning|Teaching|Fitting" },
  { number: 21, question: "What is an AI-generated picture?", answer: "Synthetic image", accepted: "Synthetic image|AI image|Deepfake" },
  { number: 22, question: "Which field helps AI understand human language?", answer: "NLP", accepted: "NLP|Natural Language Processing" },
  { number: 23, question: "What is facial recognition used to identify?", answer: "Faces", accepted: "Faces|Face|People" },
  { number: 24, question: "What should you avoid sharing with AI tools?", answer: "Secrets", accepted: "Secrets|Private data|Passwords|Personal data" },
  { number: 25, question: "Can AI make mistakes?", answer: "Yes", accepted: "Yes|True" },
];

/** Round 2 — 30 Emoji Tech Clues from source chat */
export interface EmojiTechItem {
  number: number;
  emojiClue: string;
  answer: string;
  accepted: string;
}

export const EMOJI_TECH_SOURCE: EmojiTechItem[] = [
  { number: 1, emojiClue: "☁️ + 💻", answer: "Cloud Computing", accepted: "Cloud Computing|Cloud" },
  { number: 2, emojiClue: "🧠 + 🤖", answer: "Artificial Intelligence", accepted: "Artificial Intelligence|AI" },
  { number: 3, emojiClue: "🔗 + 📦 + 📦", answer: "Blockchain", accepted: "Blockchain" },
  { number: 4, emojiClue: "🏠 + 📱 + 💡", answer: "Smart Home", accepted: "Smart Home|Home Automation" },
  { number: 5, emojiClue: "👆 + 🔒 + ✋", answer: "Fingerprint Authentication", accepted: "Fingerprint Authentication|Biometric Authentication|Fingerprint" },
  { number: 6, emojiClue: "🛰️ + 🌍 + 📍", answer: "GPS Navigation", accepted: "GPS Navigation|GPS|Navigation" },
  { number: 7, emojiClue: "🕸️ + 🌍 + 💻", answer: "World Wide Web", accepted: "World Wide Web|WWW|Web" },
  { number: 8, emojiClue: "🦠 + 💻 + 🛡️", answer: "Antivirus", accepted: "Antivirus|Anti-virus|Security" },
  { number: 9, emojiClue: "📷 + 🧠 + 👤", answer: "Facial Recognition", accepted: "Facial Recognition|Face Recognition|Face ID" },
  { number: 10, emojiClue: "🗣️ + 🤖 + 📱", answer: "Voice Assistant", accepted: "Voice Assistant|Virtual Assistant|Siri|Alexa" },
  { number: 11, emojiClue: "🎮 + 🌐 + 👥", answer: "Online Gaming", accepted: "Online Gaming|Multiplayer Gaming|Gaming" },
  { number: 12, emojiClue: "✉️ + 📎 + 📄", answer: "Email Attachment", accepted: "Email Attachment|Attachment|Email" },
  { number: 13, emojiClue: "🔐 + 🔤 + 💻", answer: "Encryption", accepted: "Encryption|Cryptography" },
  { number: 14, emojiClue: "🧑‍💻 + ⌨️ + 💻", answer: "Coding", accepted: "Coding|Programming|Software Development" },
  { number: 15, emojiClue: "📱 + 💳 + 💰", answer: "Digital Payment", accepted: "Digital Payment|Mobile Payment|E-wallet|UPI" },
  { number: 16, emojiClue: "🥽 + 🌍 + 🎮", answer: "Virtual Reality", accepted: "Virtual Reality|VR" },
  { number: 17, emojiClue: "📱 + 🌍 + ✨", answer: "Augmented Reality", accepted: "Augmented Reality|AR" },
  { number: 18, emojiClue: "🧠 + 📊 + 🤖", answer: "Machine Learning", accepted: "Machine Learning|ML" },
  { number: 19, emojiClue: "🖥️ + 🖥️ + 🌐", answer: "Computer Network", accepted: "Computer Network|Networking|Network" },
  { number: 20, emojiClue: "🐛 + 🔍 + 💻", answer: "Debugging", accepted: "Debugging|Debug|Bug Hunting" },
  { number: 21, emojiClue: "📱 + ▦ + 📷", answer: "QR Code Scanner", accepted: "QR Code Scanner|QR Code|Barcode Scanner" },
  { number: 22, emojiClue: "🗄️ + 📊 + 🔍", answer: "Database", accepted: "Database|DB|DBMS" },
  { number: 23, emojiClue: "📡 + 📱 + 📶", answer: "Wireless Communication", accepted: "Wireless Communication|Wireless Network|Wi-Fi|Cellular" },
  { number: 24, emojiClue: "🧬 + 💻 + 🔬", answer: "Bioinformatics", accepted: "Bioinformatics|Computational Biology" },
  { number: 25, emojiClue: "📝 + 🤖 + 🖼️", answer: "Generative AI", accepted: "Generative AI|Gen AI" },
  { number: 26, emojiClue: "🎭 + 👤 + 🤖", answer: "Deepfake", accepted: "Deepfake|Face Swap" },
  { number: 27, emojiClue: "🌐 + 🔍 + 📄", answer: "Search Engine", accepted: "Search Engine|Google" },
  { number: 28, emojiClue: "🖥️ + ⚡ + 🏭", answer: "Automation", accepted: "Automation|Industrial Automation|RPA" },
  { number: 29, emojiClue: "📱 + 💬 + 📹", answer: "Video Calling", accepted: "Video Calling|Video Call|Video Conference|Zoom" },
  { number: 30, emojiClue: "🚗 + 🤖 + 🛣️", answer: "Self-Driving Car", accepted: "Self-Driving Car|Autonomous Vehicle|Autonomous Car" },
];

/** Round 3 — 30 Tech Taboo Cards from source screenshots */
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
 * - Exactly 3 rounds: AI Quick Q&A, Emoji Tech Guess, Tech Taboo
 * - Exactly 5 questions per round per set (60 assigned questions total)
 * - Questions 1–5 -> Alpha, 6–10 -> Beta, 11–15 -> Gamma, 16–20 -> Delta
 * - Remaining items (AI 21–25, Emoji 21–30, Taboo 21–30) preserved in unassignedQuestions
 */
export function buildDefaultQuiz(): StoredQuiz {
  const sets = INITIAL_SETS;
  const rounds = INITIAL_ROUNDS;
  const questions: StoredQuestion[] = [];
  const unassignedQuestions: StoredQuestion[] = [];

  // Distribution map: Set index -> [startIdx, endIdx)
  // 0 -> [0, 5)   (items 1–5 Alpha)
  // 1 -> [5, 10)  (items 6–10 Beta)
  // 2 -> [10, 15) (items 11–15 Gamma)
  // 3 -> [15, 20) (items 16–20 Delta)
  sets.forEach((set, setIndex) => {
    const startIdx = setIndex * 5;

    // Round 1: AI Quick Q&A (5 items)
    for (let i = 0; i < 5; i++) {
      const item = AI_QA_SOURCE[startIdx + i];
      questions.push({
        id: `q-${set.id}-r1-${i + 1}`,
        setId: set.id,
        roundId: "r1",
        text: item.question,
        answer: item.accepted,
        marks: 10,
        timer: 30,
        imageUrl: "",
      });
    }

    // Round 2: Emoji Tech Guess (5 items)
    for (let i = 0; i < 5; i++) {
      const item = EMOJI_TECH_SOURCE[startIdx + i];
      questions.push({
        id: `q-${set.id}-r2-${i + 1}`,
        setId: set.id,
        roundId: "r2",
        text: `Guess the tech term from emojis: ${item.emojiClue}`,
        emojiClue: item.emojiClue,
        answer: item.accepted,
        marks: 10,
        timer: 30,
        imageUrl: "",
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
  for (let i = 20; i < AI_QA_SOURCE.length; i++) {
    const item = AI_QA_SOURCE[i];
    unassignedQuestions.push({
      id: `q-unassigned-r1-${item.number}`,
      setId: "unassigned",
      roundId: "r1",
      text: item.question,
      answer: item.accepted,
      marks: 10,
      timer: 30,
      imageUrl: "",
    });
  }

  // R2 items 21–30
  for (let i = 20; i < EMOJI_TECH_SOURCE.length; i++) {
    const item = EMOJI_TECH_SOURCE[i];
    unassignedQuestions.push({
      id: `q-unassigned-r2-${item.number}`,
      setId: "unassigned",
      roundId: "r2",
      text: `Guess the tech term from emojis: ${item.emojiClue}`,
      emojiClue: item.emojiClue,
      answer: item.accepted,
      marks: 10,
      timer: 30,
      imageUrl: "",
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
