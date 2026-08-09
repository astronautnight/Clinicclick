// FeaturedPost.jsx
// Usage: <FeaturedPost post={featuredPost} />

import Link from "next/link";

// Illustration matching the app's actual UI — doctor cards + calendar grid
const FeaturedIllustration = () => (
  <svg width="260" height="200" viewBox="0 0 260 200" fill="none" aria-hidden="true" className="max-w-full">
    {/* App window */}
    <rect x="10" y="10" width="170" height="130" rx="10" fill="white" stroke="#AFA9EC" strokeWidth="0.8" />
    {/* Window titlebar */}
    <rect x="10" y="10" width="170" height="22" rx="10" fill="#EEEDFE" />
    <rect x="10" y="22" width="170" height="10" fill="#EEEDFE" />
    <circle cx="22" cy="21" r="4" fill="#534AB7" fillOpacity="0.4" />
    <circle cx="33" cy="21" r="4" fill="#534AB7" fillOpacity="0.25" />
    <circle cx="44" cy="21" r="4" fill="#534AB7" fillOpacity="0.15" />

    {/* Doctor cards row */}
    <rect x="18" y="40" width="44" height="36" rx="6" fill="#E1F5EE" stroke="#9FE1CB" strokeWidth="0.8" />
    <rect x="24" y="46" width="20" height="3" rx="1.5" fill="#0F6E56" fillOpacity="0.6" />
    <rect x="24" y="52" width="28" height="2" rx="1" fill="#B4B2A9" fillOpacity="0.5" />
    <rect x="24" y="57" width="22" height="2" rx="1" fill="#B4B2A9" fillOpacity="0.4" />
    <circle cx="54" cy="46" r="5" fill="#1D9E75" fillOpacity="0.25" />

    <rect x="68" y="40" width="44" height="36" rx="6" fill="#FBEAF0" stroke="#ED93B1" strokeWidth="0.8" />
    <rect x="74" y="46" width="20" height="3" rx="1.5" fill="#993556" fillOpacity="0.6" />
    <rect x="74" y="52" width="28" height="2" rx="1" fill="#B4B2A9" fillOpacity="0.5" />
    <rect x="74" y="57" width="22" height="2" rx="1" fill="#B4B2A9" fillOpacity="0.4" />
    <circle cx="104" cy="46" r="5" fill="#D4537E" fillOpacity="0.25" />

    <rect x="118" y="40" width="44" height="36" rx="6" fill="#FAEEDA" stroke="#FAC775" strokeWidth="0.8" />
    <rect x="124" y="46" width="20" height="3" rx="1.5" fill="#633806" fillOpacity="0.6" />
    <rect x="124" y="52" width="28" height="2" rx="1" fill="#B4B2A9" fillOpacity="0.5" />
    <rect x="124" y="57" width="22" height="2" rx="1" fill="#B4B2A9" fillOpacity="0.4" />
    <circle cx="154" cy="46" r="5" fill="#EF9F27" fillOpacity="0.25" />

    {/* Calendar / day view */}
    <rect x="18" y="84" width="144" height="48" rx="6" fill="#F8F8FC" />
    <rect x="18" y="84" width="144" height="12" rx="6" fill="#EEEDFE" />
    <rect x="18" y="90" width="144" height="6" fill="#EEEDFE" />
    {/* Cal header cells */}
    {[0,1,2,3,4,5].map((i) => (
      <rect key={i} x={22 + i * 23} y={86} width={18} height={6} rx={2} fill="#534AB7" fillOpacity={i === 0 ? 0.45 : 0.15} />
    ))}
    {/* Appointment blocks */}
    <rect x="26" y="100" width="34" height="26" rx="3" fill="#E1F5EE" stroke="#9FE1CB" strokeWidth="0.8" />
    <rect x="28" y="104" width="20" height="2.5" rx="1.25" fill="#0F6E56" fillOpacity="0.6" />
    <rect x="28" y="109" width="14" height="2" rx="1" fill="#0F6E56" fillOpacity="0.35" />

    <rect x="64" y="100" width="34" height="18" rx="3" fill="#FBEAF0" stroke="#ED93B1" strokeWidth="0.8" />
    <rect x="66" y="104" width="20" height="2.5" rx="1.25" fill="#993556" fillOpacity="0.6" />
    <rect x="66" y="109" width="14" height="2" rx="1" fill="#993556" fillOpacity="0.35" />

    <rect x="102" y="106" width="34" height="24" rx="3" fill="#FAEEDA" stroke="#FAC775" strokeWidth="0.8" />
    <rect x="104" y="110" width="20" height="2.5" rx="1.25" fill="#633806" fillOpacity="0.6" />
    <rect x="104" y="115" width="14" height="2" rx="1" fill="#633806" fillOpacity="0.35" />

    {/* Patient record panel (right) */}
    <rect x="192" y="30" width="58" height="100" rx="8" fill="white" stroke="#B5D4F4" strokeWidth="0.8" />
    <rect x="192" y="30" width="58" height="16" rx="8" fill="#E6F1FB" />
    <rect x="192" y="38" width="58" height="8" fill="#E6F1FB" />
    <rect x="198" y="34" width="30" height="4" rx="2" fill="#185FA5" fillOpacity="0.4" />
    <circle cx="210" cy="58" r="10" fill="#E6F1FB" stroke="#B5D4F4" strokeWidth="0.8" />
    <rect x="206" y="55" width="8" height="6" rx="1.5" fill="#185FA5" fillOpacity="0.5" />
    <rect x="198" y="74" width="44" height="3" rx="1.5" fill="#2C2C2A" fillOpacity="0.2" />
    <rect x="198" y="80" width="36" height="2.5" rx="1.25" fill="#B4B2A9" fillOpacity="0.4" />
    <rect x="198" y="86" width="40" height="2.5" rx="1.25" fill="#B4B2A9" fillOpacity="0.4" />
    <rect x="198" y="92" width="32" height="2.5" rx="1.25" fill="#B4B2A9" fillOpacity="0.4" />
    <rect x="198" y="104" width="44" height="14" rx="4" fill="#E1F5EE" stroke="#9FE1CB" strokeWidth="0.8" />
    <rect x="202" y="109" width="24" height="3" rx="1.5" fill="#0F6E56" fillOpacity="0.5" />

    {/* Checkmark badge */}
    <circle cx="220" cy="160" r="18" fill="#EAF3DE" stroke="#C0DD97" strokeWidth="0.8" />
    <path d="M212 160 L217 165 L228 153" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function FeaturedPost({ post }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 bg-white border border-gray-100 rounded-xl overflow-hidden mb-8">
      {/* Illustration side */}
      <div className="bg-gradient-to-br from-[#EEEDFE] via-[#E6F1FB] to-[#FBEAF0] min-h-[200px] flex items-center justify-center p-6">
        <FeaturedIllustration />
      </div>

      {/* Text side */}
      <div className="p-7 flex flex-col justify-center">
        <span className="text-[10px] uppercase tracking-[0.08em] text-[#534AB7] bg-[#EEEDFE] px-2.5 py-1 rounded-full w-fit mb-4">
          {post.categoryLabel}
        </span>

        <h2 className="text-[19px] font-medium text-gray-900 leading-snug mb-3">
          {post.title}
        </h2>

        <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-3 text-[11.5px] text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {post.readTime}
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {post.date}
          </span>
        </div>

        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#185FA5] hover:text-[#0C447C] transition-colors w-fit"
        >
          Read article
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
