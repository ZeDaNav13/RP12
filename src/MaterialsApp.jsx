import { useEffect } from "react";

import MaterialsTool from "./MaterialsTool.jsx";
import ToolHeader from "./shared/ToolHeader.jsx";
import { useStyleguide } from "./shared/styleguide.js";

const APP_TITLE = "Lista de Materiais MDC";

export default function MaterialsApp() {
  useStyleguide();

  useEffect(() => {
    document.title = APP_TITLE;
  }, []);

  return (
    <main className="page">
      <ToolHeader title={APP_TITLE} />
      <MaterialsTool />
    </main>
  );
}
