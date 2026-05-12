
'use client';

import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { InventoryItem } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const { firestore: db } = initializeFirebase();

type UpdatableItemData = Partial<Omit<InventoryItem, 'id' | 'createdAt'>>;

export async function addItem(clinicId: string, categoryId: string, itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'category'>): Promise<void> {
  if (!clinicId || !categoryId) {
    throw new Error('Clinic ID and Category ID are required to add an item.');
  }
  
  const itemsColRef = collection(db, "clinics", clinicId, "inventoryCategories", categoryId, "items");
  
  const payload = {
    ...itemData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  addDoc(itemsColRef, payload).catch(error => {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: itemsColRef.path,
        operation: 'create',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    } else {
        throw error;
    }
  });
}

export async function updateItem(clinicId: string, categoryId: string, itemId: string, itemData: UpdatableItemData): Promise<void> {
    if (!clinicId || !categoryId || !itemId) {
        throw new Error('Clinic ID, Category ID, and Item ID are required to update an item.');
    }

    const itemDocRef = doc(db, "clinics", clinicId, "inventoryCategories", categoryId, "items", itemId);

    const payload = {
        ...itemData,
        updatedAt: serverTimestamp(),
    };

    updateDoc(itemDocRef, payload).catch(error => {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: itemDocRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            throw error;
        }
    });
}


export async function deleteItem(clinicId: string, categoryId: string, itemId: string): Promise<void> {
  if (!clinicId || !categoryId || !itemId) {
    throw new Error('Clinic ID, Category ID and Item ID are required to delete an item.');
  }

  const itemDocRef = doc(db, "clinics", clinicId, "inventoryCategories", categoryId, "items", itemId);

  deleteDoc(itemDocRef).catch(error => {
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: itemDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        throw error;
      }
  });
}
