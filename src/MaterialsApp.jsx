import { useEffect } from "react";

import MaterialsTool from "./MaterialsTool.jsx";
import ToolHeader from "./shared/ToolHeader.jsx";
import { useStyleguide } from "./shared/styleguide.js";

export default function MaterialsApp() {
  useStyleguide();

  useEffect(() => {
    document.title = "Ferramenta MDC - Materiais";
  }, []);

  return (
    <main className="page">
      <ToolHeader title="Ferramenta MdC" />
      <MaterialsTool />
    </main>
  );
}
