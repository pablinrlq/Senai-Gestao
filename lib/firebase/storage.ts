import { storage } from "./admin";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs-extra";
import * as path from "path";

const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "atestados";

export async function uploadImageToStorage(
  file: File,
  userId: string,
  folder: string = "atestados"
): Promise<{ url: string; path: string }> {
  try {
    console.log(
      `[Storage] Starting upload - Bucket: ${STORAGE_BUCKET}, Folder: ${folder}, User: ${userId}`
    );

    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `${folder}/${userId}/${uuidv4()}.${fileExtension}`;

    console.log(
      `[Storage] File path: ${fileName}, Type: ${file.type}, Size: ${file.size} bytes`
    );

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Storage] Buffer created, size: ${buffer.length} bytes`);

    const uploadResult = await storage.uploadFile(
      STORAGE_BUCKET,
      fileName,
      buffer,
      file.type
    );

    console.log(`[Storage] Upload successful:`, uploadResult);

    const publicUrl = storage.getPublicUrl(STORAGE_BUCKET, fileName);

    console.log(`[Storage] Public URL generated: ${publicUrl}`);

    return { url: publicUrl, path: fileName };
  } catch (error) {
    console.error("[Storage] Error uploading file to Supabase Storage:", error);
    console.error("[Storage] Bucket:", STORAGE_BUCKET);
    console.error("[Storage] Error details:", JSON.stringify(error, null, 2));
    throw new Error(
      `Failed to upload image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function uploadImageToPublicFolder(
  file: File,
  userId: string,
  folder: string = "atestados"
): Promise<{ url: string; path: string }> {
  try {
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `${uuidv4()}.${fileExtension}`;
    const relativePath = `uploads/${folder}/${userId}`;
    const fullPath = path.join(process.cwd(), "public", relativePath);
    const filePath = path.join(fullPath, fileName);

    await fs.ensureDir(fullPath);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/${relativePath}/${fileName}`;
    const storagePath = `${relativePath}/${fileName}`;

    return {
      url: publicUrl,
      path: storagePath,
    };
  } catch (error) {
    console.error("Error uploading file to public folder:", error);
    throw new Error("Failed to upload image to public folder");
  }
}

export async function deleteImageFromPublicFolder(
  filePath: string
): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), "public", filePath);
    await fs.remove(fullPath);
  } catch (error) {
    console.error("Error deleting file from public folder:", error);
    throw new Error("Failed to delete image from public folder");
  }
}

export async function deleteImageFromStorage(filePath: string): Promise<void> {
  try {
    await storage.removeFile(STORAGE_BUCKET, filePath);
  } catch (error) {
    console.error("Error deleting file from Supabase Storage:", error);
    throw new Error("Failed to delete image");
  }
}
