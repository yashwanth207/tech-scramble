import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "assets", "photos");
const provenancePath = path.join(root, "src", "content", "generated", "photo-provenance.json");
const userAgent = "TechVerseEducationalGame/1.0 (local party game; attribution stored with each image)";

const known = [
  ["photo-f-cat", "foundations", "easy", "animal", "File:Cat Sitting In Front Of Tree.jpg"],
  ["photo-f-ramen", "foundations", "easy", "food", "File:JP 沖繩 Okinawa 那霸市 Naha City 國際通 Kokusai-dori shop 沖繩自家製生麵 Yunami Sakashita-ten 板下店 Restaurant food 豬肉 Pork 排骨麵 rib noodle soup bowl February 2026 N13P 02.jpg"],
  ["photo-f-bicycle", "foundations", "easy", "object", "File:Blue bicycle against a brick wall, Quebec City.jpg"],
  ["photo-f-bench", "foundations", "medium", "place", "File:Bench autumn.JPG"],
  ["photo-f-mug", "foundations", "medium", "object", "File:Fidels, Wellington (3526688400).jpg"],
  ["photo-c-watch", "code", "easy", "object", "File:腕時計 (12259480774).jpg", "photo-c-keyboard.jpg"],
  ["photo-c-duck", "code", "easy", "object", "File:Rubber duck, Kimmeridge Bay - geograph.org.uk - 899780.jpg"],
  ["photo-c-server", "code", "medium", "technology", "File:Knams-15-knsq-4.jpg"],
  ["photo-c-desk", "code", "medium", "technology", "File:Schreibtisch.2.JPG"],
  ["photo-c-circuit", "code", "hard", "technology", "File:Cree XLamp XR-E 7090 Q4 on star top view.png"],
  ["photo-a-drone", "ai", "medium", "place", "File:Abbaye de Jumièges by quadcopter -0058.jpg"],
];

function strip(value = "") {
  return value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();
}

async function infoForTitle(title) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "1400");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, (6 + attempt * 6) * 1000));
      continue;
    }
    if (!response.ok) throw new Error(`status ${response.status}`);
    const payload = await response.json();
    return Object.values(payload.query?.pages ?? {})[0];
  }
  throw new Error("rate limited");
}

await mkdir(path.dirname(provenancePath), { recursive: true });
const records = [];
for (const [assetId, setId, difficulty, subject, title, alias] of known) {
  const ext = title.endsWith(".png") ? "png" : "jpg";
  const preferred = path.join(outDir, `${assetId}.${ext}`);
  const aliasPath = alias ? path.join(outDir, alias) : preferred;
  const file = existsSync(preferred) ? preferred : aliasPath;
  if (!existsSync(file)) {
    console.log(`MISSING FILE ${assetId}`);
    continue;
  }
  if (file !== preferred) {
    const { rename } = await import("node:fs/promises");
    await rename(file, preferred);
  }
  const page = await infoForTitle(title);
  const info = page?.imageinfo?.[0];
  if (!info) {
    console.log(`NO_INFO ${assetId}`);
    continue;
  }
  const meta = info.extmetadata ?? {};
  const bytes = await readFile(preferred);
  records.push({
    asset_id: assetId,
    set_id: setId,
    difficulty,
    subject,
    label: "real",
    kind: "photograph",
    src: `/assets/photos/${path.basename(preferred)}`,
    alt: strip(meta.ObjectName?.value || title.replace(/^File:/, "")),
    source_identity: `commons:${title}`,
    source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    creator: strip(meta.Artist?.value || meta.Credit?.value || "Wikimedia Commons contributor"),
    license: strip(meta.LicenseShortName?.value ?? ""),
    license_url: strip(meta.LicenseUrl?.value || ""),
    description: strip(meta.ImageDescription?.value ?? ""),
    width: info.thumbwidth || info.width,
    height: info.thumbheight || info.height,
    content_sha256: createHash("sha256").update(bytes).digest("hex"),
    commons_title: title,
  });
  console.log(`OK ${assetId}`);
  await writeFile(provenancePath, JSON.stringify({ fetched_at: new Date().toISOString(), photos: records }, null, 2));
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
console.log(`Hydrated ${records.length}`);
