const FILENAME_UNSAFE_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F]/g;

export function materialsPdfTitle(normalizedMdc) {
  return `Lista de Materiais - ${normalizedMdc.replace(FILENAME_UNSAFE_CHARACTERS, "_")}`;
}

export function printMaterialsPdf({ normalizedMdc, documentObject, print }) {
  const originalTitle = documentObject.title;
  documentObject.title = materialsPdfTitle(normalizedMdc);

  try {
    print();
  } finally {
    documentObject.title = originalTitle;
  }
}
