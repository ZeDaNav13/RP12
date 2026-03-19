# Styleguide (Brand Colors)

The app reads colors at runtime from:
- `public/styleguide.json`

To change the color palette, edit only that file and redeploy.

## JSON fields

- `main_dark`: main dark color (header background, card text)
- `secondary_dark`: secondary dark (copy buttons, table header background, dropdown arrow)
- `secondary_white`: light surface color (dropdowns, summary/table body blocks)
- `off_white`: card background and header text color in current UI
- `main_white`: pure white (footer/table header text/dividers)
- `text`: base text color
- `print_text`: text color in print/PDF layout
- `print_line`: border/divider color in print/PDF layout
- `print_bg`: background color in print/PDF layout

## Example

```json
{
  "main_dark": "#292929",
  "secondary_dark": "#777777",
  "secondary_white": "#D1D1D1",
  "off_white": "#F0EEE9",
  "main_white": "#FFFFFF",
  "text": "#292929",
  "print_text": "#111111",
  "print_line": "#DDDDDD",
  "print_bg": "#FFFFFF"
}
```

## Notes

- Use valid hex values (`#RRGGBB`).
- If `styleguide.json` is missing/unreadable, app falls back to built-in defaults.
