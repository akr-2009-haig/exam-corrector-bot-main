/**
 * Image upload storage. Students/admins upload photos straight from the browser
 * (no Telegram file_ids any more); we keep them on disk so the admin can later
 * view a student's answer sheet. Paths (relative to UPLOAD_DIR) are stored in
 * the `submissions.photo_ids` / `exams.question_photo_ids` JSON columns.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB per image
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function extFor(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "jpg";
  }
}

export interface SavedImage {
  /** Stored path relative to UPLOAD_DIR, e.g. "ab12/0.jpg". */
  rel: string;
  /** A base64 data: URL suitable for the vision model. */
  dataUrl: string;
}

/** Persist an uploaded File and return its relative path + data URL. */
export async function saveImage(file: File, group: string, index: number): Promise<SavedImage> {
  const mime = ALLOWED.has(file.type) ? file.type : "image/jpeg";
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength === 0) throw new Error("empty image");
  if (buf.byteLength > MAX_BYTES) throw new Error("image too large");

  const dir = path.join(UPLOAD_DIR, group);
  await fs.mkdir(dir, { recursive: true });
  const name = `${index}.${extFor(mime)}`;
  await fs.writeFile(path.join(dir, name), buf);

  return {
    rel: `${group}/${name}`,
    dataUrl: `data:${mime};base64,${buf.toString("base64")}`,
  };
}

/** A fresh group id for one submission's batch of photos. */
export function newGroup(): string {
  return randomUUID().slice(0, 8);
}

/** Read a stored image back (for the admin "view sheet" route). */
export async function readImage(
  rel: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  // Guard against path traversal: only allow our own relative paths.
  const safe = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(UPLOAD_DIR, safe);
  if (!full.startsWith(path.resolve(UPLOAD_DIR))) return null;
  try {
    const buf = await fs.readFile(full);
    const ext = path.extname(full).slice(1).toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "heic" || ext === "heif"
            ? `image/${ext}`
            : "image/jpeg";
    return { buf, contentType };
  } catch {
    return null;
  }
}
