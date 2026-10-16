import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const title = "File:DSC 9451 A colorful market display of fresh produce including apples lemons cherries grapes and ears of corn.jpg";
const userAgent = "TechVerseEducationalGame/1.0 (local party game; attribution stored with each image)";

function strip(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const url = new URL("https://commons.wikimedia.org/w/api.php");
url.searchParams.set("action", "query");
url.searchParams.set("format", "json");
url.searchParams.set("titles", title);
url.searchParams.set("prop", "imageinfo|categories");
url.searchParams.set("cllimit", "30");
url.searchParams.set("iiprop", "url|size|mime|extmetadata");
url.searchParams.set("iiurlwidth", "1400");

const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
if (!response.ok) throw new Error(`metadata ${response.status}`);
const payload = await response.json();
const page = Object.values(payload.query.pages)[0];
const info = page.imageinfo?.[0];
if (!info || info.mime !== "image/jpeg") throw new Error("expected a jpeg");
const categories = (page.categories ?? []).map((category) => category.title).join(" ");
if (/painting|artwork|drawing|illustration/i.test(categories)) throw new Error(`not a photograph: ${categories}`);

const image = await fetch(info.thumburl || info.url, { headers: { "User-Agent": userAgent } });
if (!image.ok) throw new Error(`download ${image.status}`);
const bytes = Buffer.from(await image.arrayBuffer());
await writeFile("public/assets/photos/photo-m-fruit.jpg", bytes);

const meta = info.extmetadata ?? {};
const record = {
  asset_id: "photo-m-fruit",
  set_id: "mix",
  difficulty: "easy",
  subject: "food",
  label: "real",
  kind: "photograph",
  src: "/assets/photos/photo-m-fruit.jpg",
  alt: "A market display of apples, lemons, cherries, grapes, and corn",
  source_identity: `commons:${page.title}`,
  source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
  creator: strip(meta.Artist?.value || meta.Credit?.value || "Unknown photographer"),
  license: strip(meta.LicenseShortName?.value ?? ""),
  license_url: strip(meta.LicenseUrl?.value || ""),
  description: strip(meta.ImageDescription?.value ?? ""),
  width: info.thumbwidth || info.width,
  height: info.thumbheight || info.height,
  content_sha256: createHash("sha256").update(bytes).digest("hex"),
  commons_title: page.title,
};

if (!record.creator || !record.license || !record.source_url.startsWith("https://commons.wikimedia.org/")) {
  throw new Error("incomplete provenance");
}

const path = "src/content/generated/photo-provenance.json";
const data = JSON.parse(await readFile(path, "utf8"));
const index = data.photos.findIndex((photo) => photo.asset_id === "photo-m-fruit");
if (index < 0) data.photos.push(record);
else data.photos[index] = record;
await writeFile(path, JSON.stringify(data, null, 2));
console.log(`${record.creator} / ${record.license} / ${record.width}x${record.height}`);
