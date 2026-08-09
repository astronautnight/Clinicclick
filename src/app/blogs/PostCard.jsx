// PostCard.jsx
// Usage: <PostCard post={post} />

import Link from "next/link";

// Maps category ID → color tokens matching Clinic@Click's design system
const CATEGORY_COLORS = {
  "patient-management": {
    art: "bg-[#E1F5EE]",
    tag: "bg-[#E1F5EE] text-[#0F6E56]",
    border: "border-[#9FE1CB]",
  },
  appointments: {
    art: "bg-[#E1F5EE]",
    tag: "bg-[#E1F5EE] text-[#0F6E56]",
    border: "border-[#9FE1CB]",
  },
  billing: {
    art: "bg-[#FAEEDA]",
    tag: "bg-[#FAEEDA] text-[#633806]",
    border: "border-[#FAC775]",
  },
  clinical: {
    art: "bg-[#EEEDFE]",
    tag: "bg-[#EEEDFE] text-[#3C3489]",
    border: "border-[#AFA9EC]",
  },
  students: {
    art: "bg-[#FBEAF0]",
    tag: "bg-[#FBEAF0] text-[#72243E]",
    border: "border-[#ED93B1]",
  },
  updates: {
    art: "bg-[#EAF3DE]",
    tag: "bg-[#EAF3DE] text-[#27500A]",
    border: "border-[#C0DD97]",
  },
};

// Category art illustrations as inline SVGs
const CategoryArt = ({ category }) => {
  switch (category) {
    case "patient-management":
    case "appointments":
      return (
        <svg width="80" height="70" viewBox="0 0 80 70" fill="none" aria-hidden="true">
          <rect x="10" y="10" width="60" height="50" rx="6" fill="white" stroke="#9FE1CB" strokeWidth="0.8" />
          <rect x="10" y="10" width="60" height="14" rx="6" fill="#9FE1CB" />
          <rect x="10" y="17" width="60" height="7" fill="#9FE1CB" />
          <rect x="16" y="30" width="30" height="3" rx="1.5" fill="#0F6E56" fillOpacity="0.4" />
          <rect x="16" y="37" width="48" height="2.5" rx="1.25" fill="#B4B2A9" fillOpacity="0.5" />
          <rect x="16" y="43" width="40" height="2.5" rx="1.25" fill="#B4B2A9" fillOpacity="0.5" />
          <rect x="16" y="50" width="20" height="6" rx="3" fill="#9FE1CB" />
        </svg>
      );
    case "billing":
      return (
        <svg width="80" height="70" viewBox="0 0 80 70" fill="none" aria-hidden="true">
          <rect x="12" y="15" width="56" height="40" rx="6" fill="white" stroke="#FAC775" strokeWidth="0.8" />
          <rect x="20" y="24" width="40" height="5" rx="2.5" fill="#FAC775" />
          <rect x="20" y="33" width="24" height="14" rx="3" fill="#FAEEDA" stroke="#FAC775" strokeWidth="0.8" />
          <rect x="48" y="33" width="12" height="14" rx="3" fill="#EF9F27" fillOpacity="0.3" />
          <rect x="23" y="36" width="18" height="3" rx="1.5" fill="#633806" fillOpacity="0.5" />
          <rect x="23" y="41" width="12" height="2.5" rx="1.25" fill="#633806" fillOpacity="0.35" />
          <rect x="20" y="50" width="40" height="3" rx="1.5" fill="#FAC775" fillOpacity="0.5" />
        </svg>
      );
    case "clinical":
      return (
        <svg width="80" height="70" viewBox="0 0 80 70" fill="none" aria-hidden="true">
          <circle cx="40" cy="35" r="20" fill="white" stroke="#AFA9EC" strokeWidth="0.8" />
          <path
            d="M40 22 C35 22 30 26 30 32 C30 38 33 42 37 44 C38 45 39 45 40 45 C41 45 42 45 43 44 C47 42 50 38 50 32 C50 26 45 22 40 22Z"
            fill="#EEEDFE"
            stroke="#AFA9EC"
            strokeWidth="0.8"
          />
          <circle cx="40" cy="35" r="4" fill="#7F77DD" fillOpacity="0.6" />
          <path d="M50 25 C52 23 54 23 55 25" stroke="#534AB7" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="54" cy="23" r="2.5" fill="#7F77DD" />
        </svg>
      );
    case "students":
      return (
        <svg width="80" height="70" viewBox="0 0 80 70" fill="none" aria-hidden="true">
          <rect x="15" y="12" width="50" height="46" rx="6" fill="white" stroke="#ED93B1" strokeWidth="0.8" />
          <rect x="15" y="12" width="50" height="14" rx="6" fill="#FBEAF0" />
          <rect x="15" y="19" width="50" height="7" fill="#FBEAF0" />
          <rect x="22" y="15" width="20" height="5" rx="2.5" fill="#ED93B1" fillOpacity="0.6" />
          <rect x="22" y="32" width="36" height="3" rx="1.5" fill="#D4537E" fillOpacity="0.3" />
          <rect x="22" y="39" width="28" height="2.5" rx="1.25" fill="#B4B2A9" fillOpacity="0.4" />
          <rect x="22" y="45" width="34" height="2.5" rx="1.25" fill="#B4B2A9" fillOpacity="0.4" />
          <rect x="22" y="52" width="16" height="4" rx="2" fill="#ED93B1" fillOpacity="0.5" />
        </svg>
      );
    case "updates":
      return (
        <svg width="80" height="70" viewBox="0 0 80 70" fill="none" aria-hidden="true">
          <rect x="14" y="14" width="52" height="42" rx="6" fill="white" stroke="#C0DD97" strokeWidth="0.8" />
          <rect x="20" y="20" width="12" height="12" rx="3" fill="#EAF3DE" stroke="#C0DD97" strokeWidth="0.8" />
          <rect x="36" y="20" width="24" height="4" rx="2" fill="#639922" fillOpacity="0.4" />
          <rect x="36" y="27" width="18" height="3" rx="1.5" fill="#B4B2A9" fillOpacity="0.4" />
          <path d="M23 26 L25 28 L29 23" stroke="#639922" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="20" y="38" width="12" height="12" rx="3" fill="#EAF3DE" stroke="#C0DD97" strokeWidth="0.8" />
          <rect x="36" y="38" width="24" height="4" rx="2" fill="#639922" fillOpacity="0.4" />
          <rect x="36" y="45" width="18" height="3" rx="1.5" fill="#B4B2A9" fillOpacity="0.4" />
          <rect x="22" y="42" width="8" height="4" rx="1" fill="#C0DD97" />
        </svg>
      );
    default:
      return null;
  }
};

export default function PostCard({ post }) {
  const colors = CATEGORY_COLORS[post.category] || CATEGORY_COLORS["updates"];

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden
                 hover:border-gray-200 transition-colors duration-150"
    >
      {/* Art zone */}
      <div className={`flex items-center justify-center h-[90px] ${colors.art}`}>
        <CategoryArt category={post.category} />
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <span className={`text-[10px] uppercase tracking-[0.07em] px-2 py-1 rounded-full w-fit mb-2 ${colors.tag}`}>
          {post.categoryLabel}
        </span>

        <p className="text-[13px] font-medium text-gray-900 leading-snug flex-1 mb-3 group-hover:text-[#185FA5] transition-colors">
          {post.title}
        </p>

        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-auto">
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {post.readTime}
          </span>
          <span>{post.date}</span>
        </div>
      </div>
    </Link>
  );
}
