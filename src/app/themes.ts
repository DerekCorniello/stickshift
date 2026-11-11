export const themes = [
  { id: "stickshift-light", label: "StickShift Light" },
  { id: "stickshift-dark", label: "StickShift Dark" },
  { id: "xbox-light", label: "Xbox Light" },
  { id: "xbox-dark", label: "Xbox Dark" },
  { id: "playstation-light", label: "PlayStation Light" },
  { id: "playstation-dark", label: "PlayStation Dark" },
  { id: "switch-light", label: "Switch Light" },
  { id: "switch-dark", label: "Switch Dark" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

const storageKey = "stickshift.theme.v1";
export const defaultTheme: ThemeId = "stickshift-light";

export function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

export function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved && isThemeId(saved) ? saved : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

export function saveTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(storageKey, theme);
  } catch (error) {
    console.warn("Could not save theme", error);
  }
}
