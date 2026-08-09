// CategoryPill.jsx
// Usage: <CategoryPill category={cat} active={activeId === cat.id} onClick={() => setActive(cat.id)} />

export default function CategoryPill({ category, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs
        transition-colors duration-150 cursor-pointer
        ${
          active
            ? "bg-[#EEEDFE] border-[#AFA9EC] text-[#3C3489]"
            : "bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
        }
      `}
    >
      {category.label}
    </button>
  );
}
