import { isThemeId, themes } from "./themes";
import type { ThemeId } from "./themes";

type Props = Readonly<{
  theme: ThemeId;
  onChange: (theme: ThemeId) => void;
}>;

export function ThemePicker({ theme, onChange }: Props) {
  return (
    <label className="theme-picker">
      <span>Theme</span>
      <select
        aria-label="Theme"
        value={theme}
        onChange={(event) => {
          if (isThemeId(event.target.value)) onChange(event.target.value);
        }}
      >
        {themes.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
