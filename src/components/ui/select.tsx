import { ChevronDownIcon } from "./icons";

/** Dropdown แบบมีป้ายกำกับ (presentational) — options จริงเติมภายหลังจากตารางอ้างอิง */
export function Select({
  label,
  placeholder,
  required,
  options = [],
}: {
  label: string;
  placeholder: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <div className="relative">
        <select
          defaultValue=""
          className="w-full appearance-none rounded-lg border border-line bg-surface py-2.5 pl-3 pr-9 text-sm text-ink outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
