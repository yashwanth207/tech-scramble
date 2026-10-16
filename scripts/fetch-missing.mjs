import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "assets", "photos");
const provenancePath = path.join(root, "src", "content", "generated", "photo-provenance.json");
const userAgent = "TechVerseEducationalGame/1.0 (local party game; attribution stored with each image)";

const slots = [
  { id: "photo-a-robot", setId: "ai", difficulty: "medium", subject: "technology", query: "industrial robot arm factory", require: /robot/i },
  { id: "photo-a-car", setId: "ai", difficulty: "hard", subject: "object", query: "sedan on a highway photograph", require: /car|auto|sedan|vehicle|road/i },
  { id: "photo-y-padlock", setId: "cyber", difficulty: "medium", subject: "object", query: "padlock on a door photograph", require: /lock|padlock/i },
  { id: "photo-y-fiber", setId: "cyber", difficulty: "hard", subject: "technology", query: "optical fiber cable photograph", require: /fiber|fibre|optic/i },
  { id: "photo-y-street", setId: "cyber", difficulty: "hard", subject: "place", query: "city street night photograph", require: /street|night|city/i },
  { id: "photo-m-fruit", setId: "mix", difficulty: "easy", subject: "food", query: "apples on a kitchen table photograph", require: /apple|fruit|pear/i },
  { id: "photo-m-lake", setId: "mix", difficulty: "medium", subject: "landscape", query: "mountain lake photograph", require: /lake|mountain/i },
  { id: "photo-m-dog", setId: "mix", difficulty: "expert", subject: "animal", query: "golden retriever photograph", require: /dog|retriever/i },
];

function strip(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function search(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "8");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "1400");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
    if (response.status === 429) {
      console.log(`429, waiting ${8 + attempt * 8}s`);
      await new Promise((resolve) => setTimeout(resolve, (8 + attempt * 8) * 1000));
      continue;
    }
    if (!response.ok) throw new Error(`Search ${response.status}`);
    const payload = await response.json();
    return Object.values(payload.query?.pages ?? {});
  }
  throw new Error("rate limited");
}

await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(provenancePath), { recursive: true });
const existing = existsSync(provenancePath) ? JSON.parse(await readFile(provenancePath, "utf8")) : { photos: [] };
const records = existing.photos ?? [];
const seen = new Set(records.map((record) => record.asset_id));

console.log("Cooling down before Commons requests");
await new Promise((resolve) => setTimeout(resolve, 3000));

for (const slot of slots) {
  if (seen.has(slot.id)) {
    console.log(`SKIP ${slot.id}`);
    continue;
  }
  try {
    const pages = await search(slot.query);
    const chosen = pages.find((page) => {
      const info = page.imageinfo?.[0];
      if (!info) return false;
      const title = page.title ?? "";
      const mime = info.mime ?? "";
      const license = strip(info.extmetadata?.LicenseShortName?.value ?? "");
      if (!/^image\/(jpeg|png|webp)$/.test(mime)) return false;
      if ((info.thumbwidth ?? 0) < 700) return false;
      if (!/public domain|cc0|cc by|cc-by|gfdl/i.test(license)) return false;
      if (/icon|logo|diagram|map|flag|drawing|painting|illustration|porn|svg|still life|artwork|canvas|wga|oil on/i.test(title)) return false;
      return slot.require.test(title);
    });
    if (!chosen) {
      console.log(`NO_MATCH ${slot.id}`);
      continue;
    }
    const info = chosen.imageinfo[0];
    const fileUrl = info.thumburl || info.url;
    const response = await fetch(fileUrl, { headers: { "User-Agent": userAgent } });
    if (!response.ok) throw new Error(`download ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const ext = info.mime === "image/png" ? "png" : "jpg";
    const filename = `${slot.id}.${ext}`;
    await writeFile(path.join(outDir, filename), bytes);
    const meta = info.extmetadata ?? {};
    const creator = strip(meta.Artist?.value || meta.Credit?.value || "Wikimedia Commons contributor");
    records.push({
      asset_id: slot.id,
      set_id: slot.setId,
      difficulty: slot.difficulty,
      subject: slot.subject,
      label: "real",
      kind: "photograph",
      src: `/assets/photos/${filename}`,
      alt: strip(meta.ObjectName?.value || chosen.title.replace(/^File:/, "")),
      source_identity: `commons:${chosen.title}`,
      source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(chosen.title.replace(/ /g, "_"))}`,
      creator,
      license: strip(meta.LicenseShortName?.value ?? ""),
      license_url: strip(meta.LicenseUrl?.value || ""),
      description: strip(meta.ImageDescription?.value ?? ""),
      width: info.thumbwidth || info.width,
      height: info.thumbheight || info.height,
      content_sha256: createHash("sha256").update(bytes).digest("hex"),
      commons_title: chosen.title,
    });
    seen.add(slot.id);
    await writeFile(provenancePath, JSON.stringify({ fetched_at: new Date().toISOString(), photos: records }, null, 2));
    console.log(`OK ${slot.id} <- ${chosen.title}`);
  } catch (error) {
    console.log(`ERR ${slot.id}: ${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

console.log(`Provenance records: ${records.length}`);
