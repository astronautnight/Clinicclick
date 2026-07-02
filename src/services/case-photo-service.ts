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

const { storage } = initializeFirebase();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Upload a single clinical photo to Firebase Storage.
 * Returns the public download URL on success, or undefined on failure.
 */
export async function uploadCasePhoto(
  uid: string,
  caseId: string,
  file: File
): Promise<string | undefined> {
  if (!uid || !caseId) {
    console.error('UID and caseId are required');
    return undefined;
  }

  if (file.size > MAX_FILE_SIZE) {
    console.error(`File "${file.name}" exceeds the 5 MB limit.`);
    return undefined;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${uid}/casePhotos/${caseId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  try {
    await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: { uploadedBy: uid },
    });
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Error uploading case photo:', error);
    return undefined;
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
