// app/blog/page.jsx  — drop this into your Next.js App Router
// Metadata for SEO is exported separately below

"use client";
import { useState, useMemo } from "react";
import { categories, featuredPost, posts } from "./blogData";
import CategoryPill from "./CategoryPill";
import FeaturedPost from "./FeaturedPost";
import PostCard from "./PostCard";

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("all");

  // Filter grid posts by active category (featured post is always shown)
  const filteredPosts = useMemo(() => {
    if (activeCategory === "all") return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* ── Page hero ──────────────────────────────────────────── */}
      <section className="pb-8 border-b border-gray-100 mb-8">
        <p className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-[#378ADD] mb-3 flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          The Clinic@Click Blog
        </p>

        <h1 className="text-[28px] sm:text-[32px] font-medium text-gray-900 leading-tight mb-3">
          Guides, tips, and insights<br className="hidden sm:block" />
          for modern dental practices
        </h1>

        <p className="text-[14px] text-gray-500 max-w-xl leading-relaxed">
          Everything you need to run a smarter clinic — from patient management to
          billing, written for dentists by people who understand the work.
        </p>
      </section>

      {/* ── Category filter pills ──────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter posts by category">
        {categories.map((cat) => (
          <CategoryPill
            key={cat.id}
            category={cat}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
          />
        ))}
      </div>

      {/* ── Featured post ─────────────────────────────────────── */}
      {(activeCategory === "all" || activeCategory === featuredPost.category) && (
        <FeaturedPost post={featuredPost} />
      )}

      {/* ── Grid divider ──────────────────────────────────────── */}
      {filteredPosts.length > 0 && (
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.07em] text-gray-400 mb-5">
          <span className="flex-1 border-t border-gray-100" />
          More articles
          <span className="flex-1 border-t border-gray-100" />
        </div>
      )}

      {/* ── Post grid ─────────────────────────────────────────── */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 text-[14px]">
          No articles in this category yet — check back soon.
        </div>
      )}

    </main>
  );
}

