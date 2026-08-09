// app/blog/[slug]/page.jsx  — individual blog post template
// Wire this to your CMS / Firestore / MDX source

import Link from "next/link";

// ── Replace this with your real data fetching ──────────────────
// e.g. fetch from Firestore, Sanity, Contentful, or local MDX files
async function getPost(slug) {
  if (slug === "how-to-manage-patient-records-dental-clinic") {
    return {
      slug,
      title: "How to Manage Patient Records in a Dental Clinic",
      category: "patient-management",
      categoryLabel: "Patient management",
      readTime: "6 min read",
      date: "1 Aug 2026",
      author: "Clinic@Click team",
      excerpt:
        "Managing patient records is one of the most important parts of running a dental clinic. Learn how to keep history, examinations, plans and photos organized.",
      content: `
<p>Managing patient records is one of the most important parts of running a dental clinic.</p>

<p>A patient's medical history, dental history, clinical findings, diagnosis, treatment plan, prescriptions, appointments, and clinical photographs all contribute to their care. As the number of patients increases, keeping all of this information organized becomes increasingly difficult.</p>

<p>Many clinics still rely on a combination of paper files, notebooks, spreadsheets, phone galleries, and messaging apps. While this may work when a clinic is small, finding the right information quickly becomes difficult as the practice grows.</p>

<p>A well-organized digital patient record system can make this process considerably easier.</p>

<h3 class="text-xl font-semibold mt-8 mb-4">What should a dental patient record contain?</h3>

<p>A complete dental record can include:</p>

<h4 class="text-lg font-medium mt-6 mb-2">1. Patient Information</h4>
<p>Basic information such as:</p>
<ul class="list-disc pl-5 mb-4">
  <li>Patient name</li>
  <li>Age</li>
  <li>Gender</li>
  <li>Contact information</li>
  <li>Relevant personal details</li>
</ul>
<p>Having this information organized makes it easier to identify and communicate with patients.</p>

<h4 class="text-lg font-medium mt-6 mb-2">2. Medical History</h4>
<p>Medical history can include:</p>
<ul class="list-disc pl-5 mb-4">
  <li>Existing systemic conditions</li>
  <li>Current medications</li>
  <li>Previous surgeries</li>
  <li>Allergies</li>
  <li>Relevant medical conditions</li>
</ul>
<p>This information can be particularly important before beginning certain dental procedures.</p>

<h4 class="text-lg font-medium mt-6 mb-2">3. Dental History</h4>
<p>A dental record should also document relevant dental history, including:</p>
<ul class="list-disc pl-5 mb-4">
  <li>Previous treatments</li>
  <li>Extractions</li>
  <li>Root canal treatments</li>
  <li>Fillings</li>
  <li>Prosthetic treatments</li>
  <li>Oral habits</li>
  <li>Previous dental complaints</li>
</ul>
<p>Keeping previous treatment information accessible allows the dentist to understand the patient's dental background without relying on memory or scattered records.</p>

<h4 class="text-lg font-medium mt-6 mb-2">4. Clinical Examination</h4>
<p>The patient's examination can be documented along with relevant findings.</p>
<p>This may include:</p>
<ul class="list-disc pl-5 mb-4">
  <li>Extraoral findings</li>
  <li>Intraoral findings</li>
  <li>Soft-tissue observations</li>
  <li>Tooth-specific findings</li>
  <li>Other relevant clinical observations</li>
</ul>

<h4 class="text-lg font-medium mt-6 mb-2">5. Diagnosis and Treatment Plan</h4>
<p>The record should connect the patient's findings with the diagnosis and proposed treatment.</p>
<p>For example:</p>
<blockquote class="border-l-4 border-gray-300 pl-4 italic my-4">
  <p><strong>Diagnosis:</strong> Dental caries involving 36</p>
  <p><strong>Treatment Plan:</strong> Restoration of 36 followed by routine follow-up.</p>
</blockquote>
<p>Keeping the diagnosis and treatment plan together with the patient's history makes the record easier to understand later.</p>

<h4 class="text-lg font-medium mt-6 mb-2">6. Clinical Photographs</h4>
<p>Dental photographs can be useful for documenting the patient's condition and monitoring treatment.</p>
<p>Instead of keeping photographs separately in a phone gallery, organizing them alongside the relevant patient record makes them much easier to find later.</p>

<h3 class="text-xl font-semibold mt-8 mb-4">Why paper and scattered records become difficult</h3>
<p>The problem isn't necessarily paper itself.</p>
<p>The problem is finding information when you need it.</p>
<p>Imagine looking for a patient's previous clinical photograph and having to search through:</p>
<p class="bg-gray-50 p-3 rounded-lg font-mono text-sm border border-gray-100 my-4 text-center">
  Phone gallery → WhatsApp → notebook → patient file → another folder
</p>
<p>This becomes increasingly inefficient as the clinic grows.</p>
<p>Digital records can bring these different pieces of information together.</p>

<h3 class="text-xl font-semibold mt-8 mb-4">What does a digital dental record system look like?</h3>
<p>A modern dental clinic management system can bring together:</p>
<div class="flex flex-col items-center gap-2 bg-gray-50 p-6 rounded-xl border border-gray-100 my-6">
  <span class="font-semibold text-gray-800">Patient Records</span>
  <span class="text-gray-400">↓</span>
  <span class="font-semibold text-gray-800">Medical & Dental History</span>
  <span class="text-gray-400">↓</span>
  <span class="font-semibold text-gray-800">Clinical Findings</span>
  <span class="text-gray-400">↓</span>
  <span class="font-semibold text-gray-800">Dental Chart</span>
  <span class="text-gray-400">↓</span>
  <span class="font-semibold text-gray-800">Diagnosis & Treatment Plan</span>
  <span class="text-gray-400">↓</span>
  <span class="font-semibold text-gray-800">Clinical Photos</span>
  <span class="text-gray-400">↓</span>
  <span class="font-semibold text-gray-800">Appointments & Follow-ups</span>
</div>
<p>Instead of maintaining each piece of information separately, everything related to the patient can be accessed from their record.</p>

<h3 class="text-xl font-semibold mt-8 mb-4">Benefits of organizing dental records digitally</h3>
<ul class="space-y-4 list-none pl-0">
  <li>
    <strong class="text-gray-800 block text-lg">Find information faster</strong>
    <span class="text-gray-600">A searchable digital record can make it easier to locate a patient and review their history.</span>
  </li>
  <li>
    <strong class="text-gray-800 block text-lg">Keep clinical information together</strong>
    <span class="text-gray-600">Medical history, dental history, findings, treatment plans, and photographs can be maintained as part of the same patient record.</span>
  </li>
  <li>
    <strong class="text-gray-800 block text-lg">Reduce unnecessary paperwork</strong>
    <span class="text-gray-600">Digital records can reduce dependence on physical files and manual registers.</span>
  </li>
  <li>
    <strong class="text-gray-800 block text-lg">Make follow-ups easier</strong>
    <span class="text-gray-600">When a patient returns, the dentist can review their previous history and treatment information instead of starting from scratch.</span>
  </li>
  <li>
    <strong class="text-gray-800 block text-lg">Improve clinic organization</strong>
    <span class="text-gray-600">When patient records, appointments, procedures, and billing are connected, the clinic can manage its daily workflow from a single system.</span>
  </li>
</ul>

<h3 class="text-xl font-semibold mt-8 mb-4">Choosing dental clinic management software</h3>
<p>If you're considering moving your clinic to digital records, look for software that provides more than just a patient database.</p>
<p>Useful features include:</p>
<ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5 list-disc mb-6">
  <li>Patient management</li>
  <li>Medical and dental history</li>
  <li>Dental chart / odontogram</li>
  <li>Appointment management</li>
  <li>Treatment plans</li>
  <li>Clinical photo storage</li>
  <li>Billing and financial management</li>
  <li>Multi-doctor support</li>
  <li>Reports and analytics</li>
</ul>
<p>The most important factor, however, is whether the system fits naturally into your clinic's workflow.</p>
<p>Software shouldn't create more work for the dental team. It should make existing work easier.</p>

<h3 class="text-xl font-semibold mt-8 mb-4">A simpler way to manage your clinic</h3>
<p>Clinic@Click brings patient records, appointments, dental charts, billing, clinical documentation, and other clinic workflows into one platform designed for dental practices.</p>
<p>Instead of managing information across multiple places, your clinic can organize it in one system.</p>
<p>And you can get started for free.</p>

<div class="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center my-8">
  <h4 class="text-lg font-bold text-blue-900 mb-2">Ready to organize your clinic?</h4>
  <a href="https://clinicatclick.com" class="inline-flex items-center justify-center px-6 py-3 bg-[#2383e2] hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">
    Try Clinic@Click free →
  </a>
</div>
      `
    };
  }
  return null;
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  return {
    title: `${post.title} | Clinic@Click`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://clinicatclick.com/blog/${post.slug}`,
      siteName: "Clinic@Click",
      type: "article",
    },
  };
}

// Category color token map — same as PostCard
const CATEGORY_COLORS = {
  "patient-management": { tag: "bg-[#E1F5EE] text-[#0F6E56]" },
  appointments:         { tag: "bg-[#E1F5EE] text-[#0F6E56]" },
  billing:              { tag: "bg-[#FAEEDA] text-[#633806]" },
  clinical:             { tag: "bg-[#EEEDFE] text-[#3C3489]" },
  students:             { tag: "bg-[#FBEAF0] text-[#72243E]" },
  updates:              { tag: "bg-[#EAF3DE] text-[#27500A]" },
};

export default async function BlogPostPage({ params }) {
  const post = await getPost(params.slug);
  const colors = CATEGORY_COLORS[post.category] || CATEGORY_COLORS["updates"];

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

      {/* ── Back link ─────────────────────────────────────────── */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-gray-400
                   hover:text-gray-600 transition-colors mb-8"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        All articles
      </Link>

      {/* ── Post header ───────────────────────────────────────── */}
      <header className="mb-10">
        <span className={`text-[10px] uppercase tracking-[0.08em] px-2.5 py-1 rounded-full w-fit mb-4 inline-block ${colors.tag}`}>
          {post.categoryLabel}
        </span>

        <h1 className="text-[26px] sm:text-[30px] font-medium text-gray-900 leading-tight mb-4">
          {post.title}
        </h1>

        <p className="text-[15px] text-gray-500 leading-relaxed mb-5">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-4 text-[12px] text-gray-400 pt-4 border-t border-gray-100">
          <span className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {post.readTime}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {post.date}
          </span>
          <span>{post.author}</span>
        </div>
      </header>

      {/* ── Post content ──────────────────────────────────────── */}
      {/* Wire your MDX renderer or rich text renderer here */}
      <article
        className="
          prose prose-gray max-w-none
          prose-headings:font-medium prose-headings:text-gray-900
          prose-p:text-gray-600 prose-p:leading-relaxed
          prose-a:text-[#185FA5] prose-a:no-underline hover:prose-a:underline
          prose-code:text-[#534AB7] prose-code:bg-[#EEEDFE] prose-code:px-1 prose-code:rounded
          prose-blockquote:border-l-[#AFA9EC] prose-blockquote:text-gray-500
        "
      >
        {post.content ? (
          // Render your MDX / rich text here
          // e.g. <MDXRemote source={post.content} />
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        ) : (
          <p className="text-gray-400 italic">
            Article content coming soon. Connect your content source in{" "}
            <code>app/blog/[slug]/page.jsx</code>.
          </p>
        )}
      </article>

      {/* ── Footer CTA ────────────────────────────────────────── */}
      <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-[14px] font-medium text-gray-900 mb-1">
            Try Clinic@Click free
          </p>
          <p className="text-[12.5px] text-gray-400">
            Everything in this article is built into the platform.
          </p>
        </div>
        <Link
          href="/signup"
          className="px-4 py-2.5 bg-[#378ADD] text-white text-[13px] rounded-lg
                     hover:bg-[#185FA5] transition-colors whitespace-nowrap"
        >
          Get started free
        </Link>
      </div>

    </main>
  );
}
