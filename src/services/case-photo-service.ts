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
    // Compress the image before uploading
    fileToUpload = await imageCompression(file, options);
    console.log(`Original size: ${file.size / 1024 / 1024} MB, Compressed size: ${fileToUpload.size / 1024 / 1024} MB`);
  } catch (error) {
    console.warn("Image compression failed, falling back to original file:", error);
  }

  const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${uid}/casePhotos/${caseId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  try {
    await uploadBytes(storageRef, fileToUpload, {
      contentType: fileToUpload.type || file.type,
      customMetadata: { uploadedBy: uid },
    });
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error: any) {
    console.error('Error uploading case photo:', error);
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
