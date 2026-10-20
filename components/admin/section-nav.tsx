import { chipClass } from "@/components/ui/chip";
export const ADMIN_SECTIONS = [
  { id: "summary", label: "Сводка" },
  { id: "users", label: "Сотрудники и роли" },
  { id: "pricing", label: "Цены и курс" },
  { id: "provider", label: "Каталог 17VIN" },
] as const;

export type AdminSectionId = (typeof ADMIN_SECTIONS)[number]["id"];

export const sectionTitle = (id: AdminSectionId) => ADMIN_SECTIONS.find((s) => s.id === id)!.label;

export function SectionNav() {
  return (
    <nav aria-label="Разделы управления" className="scroll-row -mx-4 mb-8 px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
      <ul className="flex gap-2 sm:flex-wrap">
        {ADMIN_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={chipClass(false, "text-sm")}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AdminSection({
  id,
  description,
  children,
}: {
  id: AdminSectionId;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-24 gap-4">
      <div>
        <h2 id={`${id}-title`} className="text-[22px] font-bold tracking-[-0.03em]">
          {sectionTitle(id)}
        </h2>
        {description ? <p className="mt-1 max-w-2xl text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
