import { useEffect } from "react";

const DEFAULT_STYLEGUIDE = {
  main_dark: "#292929",
  secondary_dark: "#777777",
  secondary_white: "#D1D1D1",
  off_white: "#F0EEE9",
  main_white: "#FFFFFF",
  text: "#292929",
  print_text: "#111111",
  print_line: "#DDDDDD",
  print_bg: "#FFFFFF"
};

function applyStyleguide(rawStyleguide) {
  const styleguide = {
    ...DEFAULT_STYLEGUIDE,
    ...(rawStyleguide ?? {})
  };

  const root = document.documentElement;
  root.style.setProperty("--main-blue", styleguide.main_dark);
  root.style.setProperty("--secondary-dark", styleguide.secondary_dark);
  root.style.setProperty("--secondary-white", styleguide.secondary_white);
  root.style.setProperty("--white", styleguide.off_white);
  root.style.setProperty("--main-white", styleguide.main_white);
  root.style.setProperty("--text-color", styleguide.text);
  root.style.setProperty("--print-text", styleguide.print_text);
  root.style.setProperty("--print-line", styleguide.print_line);
  root.style.setProperty("--print-bg", styleguide.print_bg);

  const encodedArrowColor = styleguide.secondary_dark.replace("#", "%23");
  const arrowSvg = `url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='${encodedArrowColor}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")`;
  root.style.setProperty("--select-arrow-icon", arrowSvg);
}

export function useStyleguide() {
  useEffect(() => {
    let cancelled = false;

    async function loadStyleguide() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}styleguide.json`, {
          cache: "no-store"
        });
        if (!response.ok) {
          applyStyleguide(DEFAULT_STYLEGUIDE);
          return;
        }
        const loadedStyleguide = await response.json();
        if (!cancelled) {
          applyStyleguide(loadedStyleguide);
        }
      } catch {
        if (!cancelled) {
          applyStyleguide(DEFAULT_STYLEGUIDE);
        }
      }
    }

    loadStyleguide();

    return () => {
      cancelled = true;
    };
  }, []);
}
