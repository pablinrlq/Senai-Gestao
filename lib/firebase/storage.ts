import { storage, supabase } from "./admin";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs-extra";
import * as path from "path";

const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "atestados"; // default bucket name

export async function uploadImageToStorage(
  file: File,
  userId: string,
  folder: string = "atestados"
): Promise<{ url: string; path: string }> {
  try {
    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `${folder}/${userId}/${uuidv4()}.${fileExtension}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    await storage.uploadFile(STORAGE_BUCKET, fileName, buffer, file.type);

    // Get public URL (bucket must be public or use signed URLs)
    const publicUrl = storage.getPublicUrl(STORAGE_BUCKET, fileName);

    return { url: publicUrl, path: fileName };
  } catch (error) {
    console.error("Error uploading file to Supabase Storage:", error);
    throw new Error("Failed to upload image");
  }
}

export async function uploadImageToPublicFolder(
  file: File,
  userId: string,
  folder: string = "atestados"
): Promise<{ url: string; path: string }> {
  try {
    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `${uuidv4()}.${fileExtension}`;
    const relativePath = `uploads/${folder}/${userId}`;
    const fullPath = path.join(process.cwd(), "public", relativePath);
    const filePath = path.join(fullPath, fileName);

    // Ensure directory exists
    await fs.ensureDir(fullPath);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write file to public folder
    await fs.writeFile(filePath, buffer);

    // Return public URL (accessible via /uploads/...)
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
