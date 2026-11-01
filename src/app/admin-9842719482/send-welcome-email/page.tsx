"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeFirebase } from "@/firebase";

function SendWelcomeEmailForm() {
  const searchParams = useSearchParams();
  const [targetUid, setTargetUid] = useState(searchParams.get("uid") || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const uidFromUrl = searchParams.get("uid");
    if (uidFromUrl) {
      setTargetUid(uidFromUrl);
    }
  }, [searchParams]);

  async function handleSend() {
    if (!targetUid.trim()) {
      setMessage("Please enter the recipient's Firebase UID.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { firebaseApp, auth } = initializeFirebase();

      if (!auth.currentUser) {
        throw new Error("Please sign in to Clinic@Click first.");
      }

      const functions = getFunctions(firebaseApp, "us-central1");

      const sendWelcome = httpsCallable<
        { targetUid: string },
        { success: boolean; recipient: string; resendId: string | null }
      >(functions, "sendManualWelcomeEmail");

      const result = await sendWelcome({
        targetUid: targetUid.trim(),
      });

      setMessage(
        `Welcome email sent successfully to ${result.data.recipient}`
      );

      setTargetUid("");
    } catch (error: any) {
      console.error("Manual welcome email error:", error);
      setMessage(error.message || "Failed to send welcome email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto mt-16 max-w-lg rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <Link
            href="/admin-9842719482"
            className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-gray-800">
          Send Welcome Email
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Manually send a Clinic@Click welcome email to a registered user.
        </p>

        <label className="mt-6 block text-sm font-medium text-gray-700">
          Recipient Firebase UID
        </label>

        <input
          type="text"
          value={targetUid}
          onChange={(e) => setTargetUid(e.target.value)}
          placeholder="Enter the user's Firebase UID"
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />

        <button
          onClick={handleSend}
          disabled={loading || !targetUid.trim()}
          className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Welcome Email"}
        </button>

        {message && (
          <p className="mt-4 break-words rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}

export default function SendWelcomeEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading…</p>
        </main>
      }
    >
      <SendWelcomeEmailForm />
    </Suspense>
  );
}

