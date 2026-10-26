import assert from "node:assert/strict";
import test from "node:test";

import { materialsPdfTitle, printMaterialsPdf } from "./bom-pdf-workflow.js";

test("materialsPdfTitle derives the suggested PDF title from the normalized MDC", () => {
  assert.equal(
    materialsPdfTitle("MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW"),
    "Lista de Materiais - MDC_iS.CP10_M3Cl2mA_pH_CD.PT_CF_BDW"
  );
});

test("materialsPdfTitle replaces every filename-unsafe character and control character", () => {
  assert.equal(
    materialsPdfTitle("MDC<>:\"/\\|?*\u0000\u001F"),
    "Lista de Materiais - MDC___________"
  );
});

test("printMaterialsPdf keeps the MDC-specific title while printing and restores it afterwards", () => {
  const documentObject = { title: "Lista de Materiais MDC" };
  let titleDuringPrint = null;

  printMaterialsPdf({
    normalizedMdc: "MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW",
    documentObject,
    print: () => {
      titleDuringPrint = documentObject.title;
    }
  });

  assert.equal(titleDuringPrint, "Lista de Materiais - MDC_iS.CP10_M3Cl2mA_pH_CD.PT_CF_BDW");
  assert.equal(documentObject.title, "Lista de Materiais MDC");
});

test("printMaterialsPdf restores the original title when printing throws", () => {
  const documentObject = { title: "Lista de Materiais MDC" };

  assert.throws(
    () => printMaterialsPdf({
      normalizedMdc: "MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW",
      documentObject,
      print: () => {
        throw new Error("print failed");
      }
    }),
    /print failed/
  );
  assert.equal(documentObject.title, "Lista de Materiais MDC");
});
