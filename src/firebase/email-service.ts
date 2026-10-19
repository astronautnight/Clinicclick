
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeFirebase } from './index';

export async function sendTestEmail() {
    const { firebaseApp, auth } = initializeFirebase();

    if (!auth.currentUser) {
        throw new Error('Please sign in before testing email.');
    }

    const functions = getFunctions(firebaseApp);
    const sendEmail = httpsCallable(functions, 'sendTestEmail');

    const result = await sendEmail();

    return result.data;
}
