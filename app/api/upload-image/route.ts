import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { checkAdmin, getBackendStatus } from "@/lib/quiz-store";

const BUCKET = "quiz-images";
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

type ImageType = "image/jpeg" | "image/png" | "image/webp";

const EXTENSIONS: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Check real file contents (magic bytes), not just user MIME type
function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  return null;
}

export async function POST(request: Request) {
  const auth = checkAdmin(request);
  if (!auth.ok) {
    return fail(auth.message, auth.status);
  }

  let file: File;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File)) return fail("No image file was sent.", 400);
    file = value;
  } catch {
    return fail("Could not read uploaded form data.", 400);
  }

  if (file.size === 0) return fail("The file is empty.", 400);
  if (file.size > MAX_BYTES) return fail("Image is too large. Maximum size is 4 MB.", 413);

  const buffer = await file.arrayBuffer();
  const type = detectImageType(new Uint8Array(buffer));
  if (!type) return fail("Only JPEG, PNG or WebP images are allowed.", 415);

  const filename = `${randomUUID()}.${EXTENSIONS[type]}`;
  const relativePath = `questions/${filename}`;

  const { supabaseUrl, isSupabaseConfigured } = getBackendStatus();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  // 1. If Supabase Storage is configured, use it
  if (isSupabaseConfigured && supabaseKey) {
    try {
      const upstream = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${relativePath}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          "Content-Type": type,
          "x-upsert": "true",
        },
        body: buffer,
      });

      if (upstream.ok) {
        const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${relativePath}`;
        return NextResponse.json({ path: relativePath, url });
      }
    } catch {
      // Fallback to local storage if Supabase upload fails
    }
  }

  // 2. Local public file storage fallback
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const targetFile = path.join(uploadsDir, filename);
    fs.writeFileSync(targetFile, Buffer.from(buffer));
    const url = `/uploads/${filename}`;
    return NextResponse.json({ path: relativePath, url });
  } catch (err) {
    return fail("Could not write image to storage.", 500);
  }
}