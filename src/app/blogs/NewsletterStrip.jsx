// NewsletterStrip.jsx
// Usage: <NewsletterStrip />

"use client";
import { useState } from "react";

export default function NewsletterStrip() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    // TODO: wire to your email provider / Firestore
    setSubmitted(true);
    setEmail("");
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5
                    bg-[#EEEDFE] border border-[#AFA9EC] rounded-xl px-7 py-6 mt-8">
      <div>
        <p className="text-[15px] font-medium text-[#26215C] mb-1">
          Get new articles in your inbox
        </p>
        <p className="text-[12.5px] text-[#534AB7]">
          One email when we publish. No spam, unsubscribe any time.
        </p>
      </div>

      {submitted ? (
        <p className="text-[13px] font-medium text-[#3C3489] whitespace-nowrap">
          ✓ You're subscribed!
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="px-3 py-2 rounded-lg border border-[#AFA9EC] text-[13px] bg-white
                       text-gray-900 placeholder-gray-400 focus:outline-none
                       focus:ring-2 focus:ring-[#534AB7] focus:ring-opacity-30 w-48"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#534AB7] text-white text-[13px] rounded-lg
                       hover:bg-[#3C3489] transition-colors whitespace-nowrap"
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}
