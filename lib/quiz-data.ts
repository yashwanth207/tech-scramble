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
}

export interface StoredQuiz {
  sets: StoredSet[];
  rounds: StoredRound[];
  questions: StoredQuestion[];
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

export const IMAGE_ROUND_NAME = "ai or real image";
export const TABOO_ROUND_NAME = "tech taboo";
export const TIKTOK_ROUND_NAME = "guess the tiktok word";

export const INITIAL_SETS: StoredSet[] = [
  { id: "s1", name: "Set 01 - Alpha" },
  { id: "s2", name: "Set 02 - Beta" },
  { id: "s3", name: "Set 03 - Gamma" },
  { id: "s4", name: "Set 04 - Delta" },
  { id: "s5", name: "Set 05 - Epsilon" },
  { id: "s6", name: "Set 06 - Zeta" },
];

export const INITIAL_ROUNDS: StoredRound[] = [
  { id: "r1", name: "Guess the TikTok Word" },
  { id: "r2", name: "AI or Real Image" },
  { id: "r3", name: "Tech Taboo" },
];

const TIKTOK_BANK: { text: string; answer: string; imageUrl?: string }[] = [
  { text: "Short for charisma; the magnetic ability to charm or persuade anyone without effort.", answer: "Rizz" },
  { text: "Used when someone executed a task with absolute flawless perfection (e.g. 'She ___ and left no crumbs').", answer: "Ate" },
  { text: "The advice given to someone who spends way too much time online arguing on Discord or Reddit.", answer: "Touch grass" },
  { text: "To show off accomplishments, wealth, or high-end PC specs intentionally.", answer: "Flex" },
  { text: "Feeling of embarrassment or unease caused by someone else's awkward behavior.", answer: "Cringe" },
  { text: "An unbelievable story or claim that is completely fabricated; false information.", answer: "Cap" },
  { text: "Genuine truth or total agreement; the opposite of 'cap'.", answer: "No cap" },
  { text: "Someone who blindly attacks or passionately defends a celebrity, brand, or programming language.", answer: "Stan" },
  { text: "Feeling suspicious or questionable, famously popularized by Among Us streams.", answer: "Sus" },
  { text: "Winning so convincingly that you effortlessly dominate the entire competition.", answer: "Cooked" },
  { text: "A subtle insult, shade, or passive-aggressive comment dropped in chat.", answer: "Tea" },
  { text: "Letting someone freely demonstrate their brilliance: 'Hold on, let him ___.'", answer: "Cook" },
  { text: "When an outfit, code refactor, or product aesthetic is extraordinarily on point.", answer: "Drip" },
  { text: "A personal quirk or warning sign in someone's personality or GitHub commit habits.", answer: "Red flag" },
  { text: "To suddenly cut off all communication with someone with zero explanation.", answer: "Ghosting" },
  { text: "Acting like the main character of a movie in ordinary daily life.", answer: "Main character energy" },
  { text: "To give someone credit, validation, or respect for doing something impressive.", answer: "Props" },
  { text: "The feeling of immense excitement, adrenaline, or anticipation before an event.", answer: "Hype" },
  { text: "Overly exaggerated emotional or theatrical behavior just for clicks and views.", answer: "Extra" },
  { text: "A vibe check that immediately tells you the energy in the room is off.", answer: "L" },
  { text: "A massive victory, win, or triumphant milestone.", answer: "W" },
  { text: "Being aggressively defensive or salty after losing a competitive coding duel.", answer: "Salty" },
  { text: "A person with zero original thoughts acting like a background video game character.", answer: "NPC" },
  { text: "Uncontrollable sudden obsession with a new tech stack, framework, or game.", answer: "Hyperfixation" },
  { text: "To expose secrets or drama openly for everyone to hear.", answer: "Spill the tea" },
  { text: "Saying something bold with full confidence and zero hesitation: 'Say that with your ___.'", answer: "Chest" },
  { text: "The modern slang term describing someone who tries way too hard to impress others.", answer: "Simp" },
  { text: "Short for legitimate or authentically cool.", answer: "Legit" },
  { text: "A stylish glow-up or remarkable positive transformation of a project or person.", answer: "Glow up" },
  { text: "Describing someone who has infinite confidence and naturally smooth social aura.", answer: "Sigma" },
];

const IMAGE_BANK: { text: string; answer: string; imageUrl?: string }[] = [
  { text: "A hyper-detailed portrait of a robotic cat with glowing fiber-optic whiskers sitting on a motherboard.", answer: "AI-generated" },
  { text: "An aerial photograph of a server warehouse in Oregon cooled with natural river mist.", answer: "Real photo" },
  { text: "An ancient Greek marble bust carved holding a 1984 Apple Macintosh computer.", answer: "AI-generated" },
  { text: "A close-up macro photograph of a silicon wafer reflecting iridescent rainbow diffraction patterns.", answer: "Real photo" },
  { text: "A bustling futuristic Tokyo night market where vendors sell holographic street food under neon rain.", answer: "AI-generated" },
  { text: "A snapshot of the Apollo 11 guidance computer rope memory being hand-woven by seamstresses.", answer: "Real photo" },
  { text: "A photorealistic render of an astronaut skateboarding down the rings of Saturn.", answer: "AI-generated" },
  { text: "A high-speed photo of a fiber-optic cable laser pulse illuminating liquid nitrogen vapor.", answer: "Real photo" },
  { text: "A Victorian-era laboratory with steam-powered vacuum tube quantum processors.", answer: "AI-generated" },
  { text: "The original wooden mouse invented by Douglas Engelbart in 1964 with two metal wheels.", answer: "Real photo" },
  { text: "A glowing underwater data center submerged in translucent coral reefs with luminescent jellyfish.", answer: "AI-generated" },
  { text: "A cleanroom technician in a full yellow bunny suit inspecting an ASML extreme ultraviolet lithography machine.", answer: "Real photo" },
  { text: "A stained glass cathedral window portraying Ada Lovelace and Alan Turing surrounded by binary halos.", answer: "AI-generated" },
  { text: "An infrared satellite photograph of Google's solar panel farm in the Mojave Desert.", answer: "Real photo" },
  { text: "A photorealistic cybernetic hummingbird pollinating metallic solar flower circuits.", answer: "AI-generated" },
  { text: "The interior cabling spaghetti of the 1946 ENIAC computer at the University of Pennsylvania.", answer: "Real photo" },
  { text: "A futuristic coffee barista robot pouring latte art in the exact shape of the Linux penguin Tux.", answer: "AI-generated" },
  { text: "An electron microscope image of a microscopic gear train etched on a micro-electromechanical chip (MEMS).", answer: "Real photo" },
  { text: "A golden retriever wearing VR goggles and typing furiously on a mechanical split keyboard.", answer: "AI-generated" },
  { text: "The magnetic core memory plane from a 1960s IBM System/360 mainframe.", answer: "Real photo" },
  { text: "A floating cloud city with towering quantum antenna spires above a sunset atmosphere.", answer: "AI-generated" },
  { text: "The deep sea submarine cable laying ship CS Long Lines spooling transatlantic fiber optic cable.", answer: "Real photo" },
  { text: "A Renaissance oil painting depicting Steve Jobs and Bill Gates disputing a graphical user interface.", answer: "AI-generated" },
  { text: "The first webcam setup created by Cambridge University scientists to monitor the Trojan Room coffee pot.", answer: "Real photo" },
  { text: "An isometric glass terrarium containing a miniature glowing cybernetic city with floating maglev trains.", answer: "AI-generated" },
  { text: "The Cray-1 supercomputer horseshoe-shaped cooling bench installed at Los Alamos National Laboratory in 1976.", answer: "Real photo" },
  { text: "A photorealistic human eye where the iris is an intricate spinning clockwork CPU socket.", answer: "AI-generated" },
  { text: "The Voyager 1 Golden Record with its etched phonograph instructions floating against interstellar space.", answer: "Real photo" },
  { text: "A drone shot of an overgrown Mayan temple reclaimed by sentient cybernetic vines.", answer: "AI-generated" },
  { text: "The CERN Large Hadron Collider particle detector cavern during maintenance with its giant toroidal magnets.", answer: "Real photo" },
];

const TABOO_BANK: { targetWord: string; tabooWords: string[]; text: string }[] = [
  {
    targetWord: "Python",
    tabooWords: ["Snake", "Programming", "Language", "Guido", "Code"],
    text: "Describe this technology to your team without saying any of the prohibited words!",
  },
  {
    targetWord: "Cloud Computing",
    tabooWords: ["AWS", "Server", "Internet", "Storage", "Azure"],
    text: "Describe this computing paradigm without mentioning servers, internet, or major vendors!",
  },
  {
    targetWord: "Firewall",
    tabooWords: ["Security", "Block", "Network", "Traffic", "Wall"],
    text: "Explain this defensive boundary without using security, block, or wall!",
  },
  {
    targetWord: "Bluetooth",
    tabooWords: ["Wireless", "Headphones", "Tooth", "Connect", "Pair"],
    text: "Get your team to guess this short-range communication standard without saying wireless or pair!",
  },
  {
    targetWord: "GPU",
    tabooWords: ["Nvidia", "Graphics", "Card", "Gaming", "Render"],
    text: "Explain this parallel computing hardware without saying graphics, Nvidia, or gaming!",
  },
  {
    targetWord: "Git",
    tabooWords: ["GitHub", "Commit", "Branch", "Repository", "Version"],
    text: "Explain this distributed tracking tool without mentioning GitHub, commit, or branch!",
  },
  {
    targetWord: "Machine Learning",
    tabooWords: ["AI", "Model", "Train", "Neural", "Algorithm"],
    text: "Describe teaching computers from data without saying AI, model, or training!",
  },
  {
    targetWord: "Docker",
    tabooWords: ["Container", "Whale", "Kubernetes", "Image", "Ship"],
    text: "Describe this packaging software without using container or whale!",
  },
  {
    targetWord: "Cookie",
    tabooWords: ["Browser", "Website", "Track", "Bake", "Session"],
    text: "Explain this piece of data saved by websites without saying browser or bake!",
  },
  {
    targetWord: "Cache",
    tabooWords: ["Fast", "Memory", "Store", "Speed", "Clear"],
    text: "Explain this high-speed temporary buffer without using fast, memory, or speed!",
  },
  {
    targetWord: "Blockchain",
    tabooWords: ["Crypto", "Bitcoin", "Ledger", "Decentralized", "Chain"],
    text: "Describe this distributed cryptographic record without saying crypto, bitcoin, or chain!",
  },
  {
    targetWord: "Bug",
    tabooWords: ["Insect", "Error", "Glitch", "Fix", "Code"],
    text: "Describe an unintended defect in a program without saying error, glitch, or insect!",
  },
  {
    targetWord: "Open Source",
    tabooWords: ["Free", "Public", "License", "GitHub", "Community"],
    text: "Describe software where anyone can inspect the underlying blueprints without saying free or public!",
  },
  {
    targetWord: "API",
    tabooWords: ["Interface", "Endpoint", "REST", "Connect", "Fetch"],
    text: "Explain the contract that lets two applications talk to each other without saying interface or endpoint!",
  },
  {
    targetWord: "RAM",
    tabooWords: ["Memory", "Random", "Storage", "DDR", "Volatile"],
    text: "Explain short-term temporary computer memory without saying memory, storage, or RAM!",
  },
  {
    targetWord: "Phishing",
    tabooWords: ["Email", "Scam", "Fish", "Password", "Fake"],
    text: "Describe this fraudulent attempt to steal credentials without saying email, scam, or fish!",
  },
  {
    targetWord: "Compiler",
    tabooWords: ["Translate", "Binary", "Machine", "Code", "Run"],
    text: "Describe the tool that turns human code into CPU instructions without saying translate or binary!",
  },
  {
    targetWord: "Algorithm",
    tabooWords: ["Recipe", "Step", "Math", "Procedure", "Code"],
    text: "Describe a well-defined sequence of instructions to solve a problem without saying step or recipe!",
  },
  {
    targetWord: "Malware",
    tabooWords: ["Virus", "Harm", "Infect", "Bad", "Software"],
    text: "Describe malicious software designed to compromise systems without saying virus or harm!",
  },
  {
    targetWord: "DNS",
    tabooWords: ["Domain", "IP", "Name", "Server", "Lookup"],
    text: "Explain the phonebook of the internet without saying IP, domain, or phonebook!",
  },
  {
    targetWord: "Pixel",
    tabooWords: ["Screen", "Display", "Dot", "Resolution", "Color"],
    text: "Describe the smallest controllable element of a digital picture without saying screen or dot!",
  },
  {
    targetWord: "Kernel",
    tabooWords: ["Core", "Operating System", "Linux", "Hardware", "Corn"],
    text: "Explain the lowest-level central module of an OS without saying core, Linux, or corn!",
  },
  {
    targetWord: "VPN",
    tabooWords: ["Virtual", "Private", "Network", "Tunnel", "IP"],
    text: "Explain this encrypted connection across public networks without saying private or tunnel!",
  },
  {
    targetWord: "Quantum Computer",
    tabooWords: ["Qubit", "Superposition", "Physics", "Fast", "Super"],
    text: "Explain computing using principles of subatomic mechanics without saying qubit or superposition!",
  },
  {
    targetWord: "CSS",
    tabooWords: ["Style", "HTML", "Color", "Cascading", "Design"],
    text: "Describe the stylesheet language that makes web pages look visually attractive without saying style or design!",
  },
  {
    targetWord: "Database",
    tabooWords: ["SQL", "Table", "Query", "Store", "Data"],
    text: "Describe an organized collection of structured information without saying table, SQL, or store!",
  },
  {
    targetWord: "Router",
    tabooWords: ["Wi-Fi", "Traffic", "Internet", "Packets", "Box"],
    text: "Describe the networking hardware device that directs data between networks without saying Wi-Fi or box!",
  },
  {
    targetWord: "CAPTCHA",
    tabooWords: ["Bot", "Human", "Turing", "Test", "Letters"],
    text: "Describe the challenge used to prove you are not an automated robot without saying test, bot, or human!",
  },
  {
    targetWord: "Recursion",
    tabooWords: ["Itself", "Function", "Call", "Loop", "Base Case"],
    text: "Describe when a function solves a problem by repeatedly invoking its own logic without saying itself or call!",
  },
  {
    targetWord: "Motherboard",
    tabooWords: ["Main", "Circuit", "Board", "Components", "CPU"],
    text: "Describe the primary printed circuit board holding all essential computer parts without saying board or mother!",
  },
];

export function buildDefaultQuiz(): StoredQuiz {
  const sets = INITIAL_SETS;
  const rounds = INITIAL_ROUNDS;
  const questions: StoredQuestion[] = [];

  sets.forEach((set, setIndex) => {
    // 5 questions for Round 1: TikTok
    for (let i = 0; i < 5; i++) {
      const item = TIKTOK_BANK[(setIndex * 5 + i) % TIKTOK_BANK.length];
      questions.push({
        id: `q-${set.id}-r1-${i + 1}`,
        setId: set.id,
        roundId: "r1",
        text: item.text,
        answer: item.answer,
        marks: 10,
        timer: 30,
        imageUrl: item.imageUrl ?? "",
      });
    }

    // 5 questions for Round 2: AI or Real
    for (let i = 0; i < 5; i++) {
      const item = IMAGE_BANK[(setIndex * 5 + i) % IMAGE_BANK.length];
      questions.push({
        id: `q-${set.id}-r2-${i + 1}`,
        setId: set.id,
        roundId: "r2",
        text: item.text,
        answer: item.answer,
        marks: 10,
        timer: 30,
        imageUrl: item.imageUrl ?? "",
        options: ["Real photo", "AI-generated"],
      });
    }

    // 5 questions for Round 3: Tech Taboo
    for (let i = 0; i < 5; i++) {
      const item = TABOO_BANK[(setIndex * 5 + i) % TABOO_BANK.length];
      questions.push({
        id: `q-${set.id}-r3-${i + 1}`,
        setId: set.id,
        roundId: "r3",
        text: item.text,
        answer: item.targetWord,
        marks: 15,
        timer: 60,
        imageUrl: "",
        targetWord: item.targetWord,
        tabooWords: item.tabooWords,
      });
    }
  });

  return { sets, rounds, questions };
}
