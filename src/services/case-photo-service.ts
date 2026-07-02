'use client';

/**
 * case-photo-service.ts
 *
 * Handles uploading/deleting clinical photos for student case histories.
 *
 * Firebase Storage path:
 *   users/{uid}/casePhotos/{caseId}/{timestamp}_{filename}
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import imageCompression from 'browser-image-compression';

const { storage } = initializeFirebase();

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * Upload a single clinical photo to Firebase Storage with automatic compression.
 * Returns the public download URL on success, throws error on failure.
 */
export async function uploadCasePhoto(
  uid: string,
  caseId: string,
  file: File
): Promise<string> {
  if (!uid || !caseId) {
    throw new Error('UID and caseId are required');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File "${file.name}" exceeds the 20 MB limit.`);
  }

  let fileToUpload = file;
  try {
    const options = {
      maxSizeMB: 0.75, // 750 KB
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    console.log(`[Step 5.1] Compressing image with browser-image-compression...`);
    // Compress the image before uploading
    fileToUpload = await imageCompression(file as any, options);
    console.log(`[Step 5.1] Compression successful. Original size: ${file.size}, Compressed size: ${fileToUpload.size}`);
  } catch (error: any) {
    console.warn(`[Step 5.1 Warning] Image compression failed, falling back to original file. Error: ${error.message}`);
  }

  const safeName = fileToUpload.name ? fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_') : `photo_${Date.now()}.jpg`;
  const storagePath = `users/${uid}/casePhotos/${caseId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  try {
    console.log(`[Step 5.2] Calling Firebase uploadBytes() for path: ${storagePath}`);
    await uploadBytes(storageRef, fileToUpload as Blob, {
      contentType: fileToUpload.type || file.type,
      customMetadata: { uploadedBy: uid },
    });
    console.log(`[Step 5.3] uploadBytes() finished successfully.`);
    
    console.log(`[Step 5.4] Calling getDownloadURL()...`);
    const url = await getDownloadURL(storageRef);
    console.log(`[Step 5.4] getDownloadURL() finished: ${url}`);
    return url;
  } catch (error: any) {
    console.error(`[Step 5 Error] Error in uploadCasePhoto: ${error.message}`, error);
    throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a clinical photo from Firebase Storage by its download URL.
 */
export async function deleteCasePhoto(photoUrl: string): Promise<boolean> {
  if (!photoUrl) return false;

  try {
    // Extract the storage path from the download URL
    const storageRef = ref(storage, photoUrl);
    await deleteObject(storageRef);
    return true;
  } catch (error: any) {
    // If the object doesn't exist, consider it a success
    if (error?.code === 'storage/object-not-found') {
      return true;
    }
    console.error('Error deleting case photo:', error);
    return false;
  }
}
