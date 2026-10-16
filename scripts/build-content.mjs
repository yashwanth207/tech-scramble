import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { aiRecords, generatedOn } from "../content/ai-records.mjs";
import { icons } from "../content/icons.mjs";
import { sets } from "../content/sets.mjs";
import { taboo } from "../content/taboo.mjs";
import { terms } from "../content/terms.mjs";

const root = path.resolve(import.meta.dirname, "..");
const puzzleDir = path.join(root, "public", "assets", "puzzles");
const outFile = path.join(root, "src", "content", "generated", "bank.json");
const photoPath = path.join(root, "src", "content", "generated", "photo-provenance.json");

const termTime = { easy: 40, medium: 32, hard: 26, expert: 20 };
const realTime = { easy: 22, medium: 18, hard: 14, expert: 12 };

function escapeXml(value) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function puzzleSvg(clues) {
  const width = 960;
  const height = 360;
  const panel = 250;
  const gap = 56;
  const total = clues.length * panel + (clues.length - 1) * gap;
  const start = (width - total) / 2;
  const tiles = ["#163246", "#2A2142", "#1C3330"];
  const parts = clues.map((clue, index) => {
    const icon = icons[clue.icon];
    if (!icon) throw new Error(`Missing icon ${clue.icon}`);
    const x = start + index * (panel + gap);
    return `<g transform="translate(${x} 36)">
      <rect width="${panel}" height="288" rx="28" fill="${tiles[index % tiles.length]}"/>
      <svg x="61" y="48" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#E7F2FA" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
      <text x="125" y="230" text-anchor="middle" fill="#E7F2FA" font-family="Segoe UI, sans-serif" font-size="20" font-weight="700">${escapeXml(clue.caption)}</text>
    </g>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <rect width="100%" height="100%" fill="#121820"/>
  ${parts.join("\n")}
</svg>`;
}

function termQuestion(item) {
  const questionId = `${item.setId}-term-${item.slug}`;
  const assetId = `puzzle-${item.setId}-${item.slug}`;
  return {
    question: {
      question_id: questionId,
      set_id: item.setId,
      game_mode: "term",
      difficulty: item.difficulty,
      category: item.category,
      prompt: "What technology term do these clues point to?",
      answer: item.answer,
      accepted_answers: [item.answer, ...item.aliases],
      choice_options: [item.answer, ...item.distractors],
      hints: item.hints,
      explanation: item.explanation,
      time_limit: termTime[item.difficulty],
      points: 100,
      content_status: "published",
      image_asset_ids: [assetId],
      source_identities: [`original:${assetId}`],
      asset_hashes: [],
      clues: item.clues,
    },
    assetId,
    clues: item.clues,
  };
}

function tabooQuestion(item) {
  return {
    question_id: `${item.setId}-taboo-${item.slug}`,
    set_id: item.setId,
    game_mode: "taboo",
    difficulty: item.difficulty,
    category: item.category,
    prompt: "Get your team to say this term. Do not say the forbidden words.",
    answer: item.answer,
    accepted_answers: [item.answer, ...item.aliases],
    hints: [],
    explanation: item.explanation,
    time_limit: 60,
    points: 100,
    content_status: "published",
    image_asset_ids: [],
    source_identities: [],
    asset_hashes: [],
    forbidden_words: item.forbidden,
  };
}

await mkdir(puzzleDir, { recursive: true });
await mkdir(path.dirname(outFile), { recursive: true });

const questions = [];
const assets = [];

for (const item of terms) {
  const built = termQuestion(item);
  const svg = puzzleSvg(built.clues);
  const filename = `${built.assetId}.svg`;
  await writeFile(path.join(puzzleDir, filename), svg);
  const hash = createHash("sha256").update(svg).digest("hex");
  built.question.asset_hashes = [hash];
  questions.push(built.question);
  const captionText = built.clues.map((clue) => clue.caption).join(", ");
  assets.push({
    asset_id: built.assetId,
    question_id: built.question.question_id,
    kind: "original-svg",
    src: `/assets/puzzles/${filename}`,
    alt: captionText,
    source_identity: `original:${built.assetId}`,
    source_url: "https://creativecommons.org/publicdomain/zero/1.0/",
    creator: "TechVerse",
    license: "CC0-1.0",
    license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
    provenance: "Original puzzle illustration composed for TechVerse from the project icon set.",
    attribution: "TechVerse original puzzle",
    width: 960,
    height: 360,
    content_sha256: hash,
  });
}

for (const item of taboo) questions.push(tabooQuestion(item));

if (existsSync(photoPath)) {
  const photos = JSON.parse(await readFile(photoPath, "utf8")).photos ?? [];
  for (const photo of photos) {
    const file = path.join(root, "public", photo.src.replace(/^\//, ""));
    if (!existsSync(file)) throw new Error(`Missing photo file ${photo.src}`);
    const questionId = `${photo.set_id}-realai-${photo.asset_id}`;
    const explanation = `Labeled real. Photograph by ${photo.creator}. License: ${photo.license}. Source: ${photo.source_url}. The label comes from that record, not from how realistic the picture looks.`;
    questions.push({
      question_id: questionId,
      set_id: photo.set_id,
      game_mode: "realai",
      difficulty: photo.difficulty,
      category: photo.subject,
      prompt: "Was this image captured by a camera, or generated?",
      answer: "real",
      accepted_answers: ["real"],
      hints: [],
      explanation,
      time_limit: realTime[photo.difficulty] ?? 18,
      points: 100,
      content_status: "published",
      image_asset_ids: [photo.asset_id],
      source_identities: [photo.source_identity],
      asset_hashes: [photo.content_sha256],
    });
    assets.push({
      asset_id: photo.asset_id,
      question_id: questionId,
      kind: "photograph",
      src: photo.src,
      alt: photo.alt || photo.subject,
      source_identity: photo.source_identity,
      source_url: photo.source_url,
      creator: photo.creator,
      license: photo.license,
      license_url: photo.license_url || "",
      provenance: `Wikimedia Commons file ${photo.commons_title}. Creator: ${photo.creator}. License: ${photo.license}.`,
      attribution: `${photo.creator} / ${photo.license}`,
      width: photo.width,
      height: photo.height,
      content_sha256: photo.content_sha256,
      label: "real",
    });
  }
}

for (const record of aiRecords) {
  const src = `/assets/ai/${record.assetId}.jpg`;
  const file = path.join(root, "public", src.slice(1));
  if (!existsSync(file)) {
    console.warn(`Skipping missing AI file ${record.assetId}`);
    continue;
  }
  const bytes = await readFile(file);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const questionId = `${record.setId}-realai-${record.assetId}`;
  const explanation = `Labeled AI-generated. xAI Imagine created this image on ${generatedOn}. Prompt: "${record.prompt}" A corner mark from the generator was cropped so the round is not solved by looking for a logo. The label comes from this generation record.`;
  questions.push({
    question_id: questionId,
    set_id: record.setId,
    game_mode: "realai",
    difficulty: record.difficulty,
    category: record.subject,
    prompt: "Was this image captured by a camera, or generated?",
    answer: "ai",
    accepted_answers: ["ai"],
    hints: [],
    explanation,
    time_limit: realTime[record.difficulty] ?? 16,
    points: 100,
    content_status: "published",
    image_asset_ids: [record.assetId],
    source_identities: [`xai-imagine:${record.assetId}:${generatedOn}`],
    asset_hashes: [hash],
  });
  assets.push({
    asset_id: record.assetId,
    question_id: questionId,
    kind: "ai-generated",
    src,
    alt: "Picture for the Real or AI round",
    source_identity: `xai-imagine:${record.assetId}:${generatedOn}`,
    source_url: "https://x.ai",
    creator: "xAI Imagine",
    license: "Generated for TechVerse",
    license_url: "https://x.ai",
    provenance: `Generated by xAI Imagine on ${generatedOn}. Prompt: ${record.prompt} A corner mark from the generator was cropped before publishing so the round is not solved by a logo.`,
    attribution: `xAI Imagine, ${generatedOn}`,
    width: 1248,
    height: 744,
    content_sha256: hash,
    label: "ai",
  });
}

const bank = { sets, questions, assets, generated_at: new Date().toISOString() };
await writeFile(outFile, JSON.stringify(bank));
const counts = {};
for (const question of questions) {
  const key = `${question.set_id}:${question.game_mode}`;
  counts[key] = (counts[key] ?? 0) + 1;
}
console.log(counts);
console.log(`questions ${questions.length}, assets ${assets.length}`);
