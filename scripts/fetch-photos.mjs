import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { photoSlots } from "./photo-slots.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "assets", "photos");
const provenancePath = path.join(root, "src", "content", "generated", "photo-provenance.json");
const userAgent = "TechVerseEducationalGame/1.0 (local party game; attribution stored with each image)";

function strip(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function licenseOk(name) {
  return /public domain|cc0|cc by|cc-by|gfdl|attribution/i.test(name);
}

function titleBlocked(title) {
  return /icon|logo|svg|diagram|map|flag|coat of arms|drawing|painting|illustration|sketch|cartoon|clipart|ai-generated|stable diffusion|midjourney|porn|nude|nsfw/i.test(title);
}

async function search(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "12");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "1600");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      continue;
    }
    if (!response.ok) throw new Error(`Search failed ${response.status} for ${query}`);
    const payload = await response.json();
    return Object.values(payload.query?.pages ?? {});
  }
  throw new Error(`Search rate-limited for ${query}`);
}

function pick(pages, usedTitles) {
  const ranked = pages
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info) return null;
      const meta = info.extmetadata ?? {};
      const title = page.title ?? "";
      const mime = info.mime ?? "";
      const license = strip(meta.LicenseShortName?.value ?? "");
      const description = strip(meta.ImageDescription?.value ?? "");
      if (!/^image\/(jpeg|png|webp)$/.test(mime)) return null;
      if ((info.thumbwidth ?? info.width ?? 0) < 800) return null;
      if (titleBlocked(`${title} ${description}`)) return null;
      if (!licenseOk(license)) return null;
      if (usedTitles.has(title)) return null;
      return { page, info, meta, title, license, description };
    })
    .filter(Boolean);
  return ranked[0] ?? null;
}

async function download(url) {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) throw new Error(`Download failed ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

const knownTitles = {
  "photo-f-cat": "File:Cat Sitting In Front Of Tree.jpg",
  "photo-f-ramen": "File:JP 沖繩 Okinawa 那霸市 Naha City 國際通 Kokusai-dori shop 沖繩自家製生麵 Yunami Sakashita-ten 板下店 Restaurant food 豬肉 Pork 排骨麵 rib noodle soup bowl February 2026 N13P 02.jpg",
  "photo-f-bicycle": "File:Blue bicycle against a brick wall, Quebec City.jpg",
  "photo-f-bench": "File:Bench autumn.JPG",
  "photo-f-mug": "File:Fidels, Wellington (3526688400).jpg",
  "photo-c-duck": "File:Rubber duck, Kimmeridge Bay - geograph.org.uk - 899780.jpg",
  "photo-c-server": "File:Knams-15-knsq-4.jpg",
  "photo-c-desk": "File:Schreibtisch.2.JPG",
  "photo-c-circuit": "File:Cree XLamp XR-E 7090 Q4 on star top view.png",
};

async function infoForTitle(title) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "1600");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      continue;
    }
    if (!response.ok) throw new Error(`Info failed ${response.status} for ${title}`);
    const payload = await response.json();
    return Object.values(payload.query?.pages ?? {})[0];
  }
  throw new Error(`Info rate-limited for ${title}`);
}

await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(provenancePath), { recursive: true });

const usedTitles = new Set(Object.values(knownTitles));
const records = [];

for (const slot of photoSlots) {
  const existing = ["jpg", "png", "webp"]
    .map((ext) => path.join(outDir, `${slot.id}.${ext}`))
    .find((file) => existsSync(file));
  if (existing && knownTitles[slot.id]) {
    const page = await infoForTitle(knownTitles[slot.id]);
    const info = page?.imageinfo?.[0];
    if (!info) {
      console.error(`NO_INFO ${slot.id}`);
      process.exitCode = 1;
      continue;
    }
    const meta = info.extmetadata ?? {};
    const bytes = await readFile(existing);
    const creator = strip(meta.Artist?.value || meta.Credit?.value || "Wikimedia Commons contributor");
    const objectName = strip(meta.ObjectName?.value || knownTitles[slot.id].replace(/^File:/, ""));
    records.push({
      asset_id: slot.id,
      set_id: slot.setId,
      difficulty: slot.difficulty,
      subject: slot.subject,
      label: "real",
      kind: "photograph",
      src: `/assets/photos/${path.basename(existing)}`,
      file: path.relative(root, existing).replaceAll("\\", "/"),
      alt: objectName,
      source_identity: `commons:${knownTitles[slot.id]}`,
      source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(knownTitles[slot.id].replace(/ /g, "_"))}`,
      download_url: info.thumburl || info.url,
      creator,
      license: strip(meta.LicenseShortName?.value ?? ""),
      license_url: strip(meta.LicenseUrl?.value || ""),
      description: strip(meta.ImageDescription?.value ?? ""),
      width: info.thumbwidth || info.width,
      height: info.thumbheight || info.height,
      content_sha256: createHash("sha256").update(bytes).digest("hex"),
      commons_title: knownTitles[slot.id],
    });
    console.log(`KEEP ${slot.id}`);
    await new Promise((resolve) => setTimeout(resolve, 400));
    continue;
  }

  const pages = await search(slot.query);
  const chosen = pick(pages, usedTitles);
  if (!chosen) {
    console.error(`NO_MATCH ${slot.id}: ${slot.query}`);
    process.exitCode = 1;
    continue;
  }
  usedTitles.add(chosen.title);
  const fileUrl = chosen.info.thumburl || chosen.info.url;
  const bytes = await download(fileUrl);
  const ext = chosen.info.mime === "image/png" ? "png" : chosen.info.mime === "image/webp" ? "webp" : "jpg";
  const filename = `${slot.id}.${ext}`;
  await writeFile(path.join(outDir, filename), bytes);
  const meta = chosen.meta;
  const creator = strip(meta.Artist?.value || meta.Credit?.value || "Wikimedia Commons contributor");
  const licenseUrl = strip(meta.LicenseUrl?.value || "");
  const objectName = strip(meta.ObjectName?.value || chosen.title.replace(/^File:/, ""));
  const pageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(chosen.title.replace(/ /g, "_"))}`;
  records.push({
    asset_id: slot.id,
    set_id: slot.setId,
    difficulty: slot.difficulty,
    subject: slot.subject,
    label: "real",
    kind: "photograph",
    src: `/assets/photos/${filename}`,
    file: `public/assets/photos/${filename}`,
    alt: objectName || slot.subject,
    source_identity: `commons:${chosen.title}`,
    source_url: pageUrl,
    download_url: fileUrl,
    creator,
    license: chosen.license,
    license_url: licenseUrl,
    description: chosen.description,
    width: chosen.info.thumbwidth || chosen.info.width,
    height: chosen.info.thumbheight || chosen.info.height,
    content_sha256: createHash("sha256").update(bytes).digest("hex"),
    commons_title: chosen.title,
  });
  console.log(`OK ${slot.id} <- ${chosen.title} (${chosen.license})`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}

await writeFile(provenancePath, JSON.stringify({ fetched_at: new Date().toISOString(), photos: records }, null, 2));
console.log(`Wrote ${records.length} photos`);
if (records.length !== photoSlots.length) process.exitCode = 1;
