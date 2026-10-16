import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The anon key cannot insert rows.");
  process.exit(1);
}

const bank = JSON.parse(await readFile(new URL("../src/content/generated/bank.json", import.meta.url), "utf8"));
const client = createClient(url, key, { auth: { persistSession: false } });
const sets = bank.sets.map((set, index) => ({ ...set, sort_order: index + 1 }));

const setResult = await client.from("question_sets").upsert(sets);
if (setResult.error) throw setResult.error;
const questionResult = await client.from("questions").upsert(bank.questions);
if (questionResult.error) throw questionResult.error;
const assetResult = await client.from("assets").upsert(bank.assets);
if (assetResult.error) throw assetResult.error;

const check = await client.from("questions").select("question_id", { count: "exact", head: true });
if (check.error) throw check.error;
console.log(`Seeded ${sets.length} sets, ${bank.questions.length} questions, ${bank.assets.length} assets. Remote question count: ${check.count}.`);
