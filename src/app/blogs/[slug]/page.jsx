// app/blog/[slug]/page.jsx  — individual blog post template
// Wire this to your CMS / Firestore / MDX source

import Link from "next/link";

import { POSTS } from "../../blog/[slug]/page";

async function getPost(slug) {
  return POSTS[slug] || null;
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
          href="/login"
          className="px-4 py-2.5 bg-[#378ADD] text-white text-[13px] rounded-lg
                     hover:bg-[#185FA5] transition-colors whitespace-nowrap"
        >
          Get started free
        </Link>
      </div>

    </main>
  );
}
