import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

export async function uploadAudio(uid: string, captureId: string, audioUri: string): Promise<string> {
  const response = await fetch(audioUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `captures/${uid}/${captureId}/audio.m4a`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function saveCapture(
  uid: string,
  captureId: string,
  data: {
    audioUrl: string;
    transcript: string;
  },
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'captures', captureId), {
    audioUrl: data.audioUrl,
    transcript: data.transcript,
    summary: '',
    actionItems: [],
    tags: [],
    priority: 'medium',
    createdAt: serverTimestamp(),
    completedActions: [],
  });

  const profileRef = doc(db, 'users', uid, 'profile', 'data');
  const snapshot = await getDoc(profileRef);
  if (snapshot.exists()) {
    await updateDoc(profileRef, { captureCount: increment(1) });
  } else {
    await setDoc(profileRef, { captureCount: 1, subscriptionStatus: 'free' });
  }
}

export async function updateCaptureExtraction(
  uid: string,
  captureId: string,
  extraction: {
    summary: string;
    actionItems: string[];
    tags: string[];
    priority: 'high' | 'medium' | 'low';
  },
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'captures', captureId), {
    summary: extraction.summary,
    actionItems: extraction.actionItems,
    tags: extraction.tags,
    priority: extraction.priority,
  });
}

export async function toggleActionDone(
  uid: string,
  captureId: string,
  action: string,
  markDone: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'captures', captureId), {
    completedActions: markDone ? arrayUnion(action) : arrayRemove(action),
  });
}

export async function saveSession(
  uid: string,
  sessionId: string,
  data: {
    type: 'meditation' | 'breathing';
    durationSeconds: number;
  },
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'sessions', sessionId), {
    type: data.type,
    durationSeconds: data.durationSeconds,
    completedAt: serverTimestamp(),
  });
}
