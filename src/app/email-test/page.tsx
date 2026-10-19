
'use client';

import { useState } from 'react';
import { sendTestEmail } from '@/firebase/email-service';

export default function EmailTestPage() {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSend() {
        setLoading(true);
        setMessage('');

        try {
            const result = await sendTestEmail();
            setMessage('Email request sent successfully: ' + JSON.stringify(result));
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : 'Failed to send email.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="p-8">
            <h1 className="text-xl font-semibold">Clinic@Click Email Test</h1>
            <p className="my-3">Sign in first, then send a test email to your account.</p>
            <button
                onClick={handleSend}
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
                {loading ? 'Sending...' : 'Send test email'}
            </button>
            {message && <p className="mt-4 break-words">{message}</p>}
        </main>
    );
}
