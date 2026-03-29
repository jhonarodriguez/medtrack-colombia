import { describe, it, expect } from "vitest";
import { formatearInfoMedicamento } from "../../src/use-cases/format-info-medicamento.js";
import type { InfoMedicamentoOutput } from "../../src/use-cases/info-medicamento.js";

describe("formatearInfoMedicamento()", () => {
  it("maneja medicamento no encontrado", () => {
    const resultado = formatearInfoMedicamento(null);

    expect(resultado).toContain("## Información del Medicamento");
    expect(resultado).toContain("❌ Medicamento no encontrado");
    expect(resultado).toContain("https://app.invima.gov.co/cum/");
  });

  it("genera información completa cuando medicamento existe", () => {
    const output: InfoMedicamentoOutput = {
      cum: "2000-M-9001",
      nombre_comercial: "Dolex",
      nombre_generico: "Paracetamol",
      laboratorio: "Pharmaceuticals",
      registro_sanitario: "2000M9001",
      forma_farmaceutica: "Tableta",
      concentracion: "500 mg",
      principio_activo: "Paracetamol",
      precio_regulado_sismed: 1200,
      estado_registro: "Vigente",
      fecha_consulta: new Date().toISOString(),
    };

    const resultado = formatearInfoMedicamento(output);

    expect(resultado).toContain("✅ Registro INVIMA vigente");
    expect(resultado).toContain("Dolex");
    expect(resultado).toContain("Paracetamol");
  });

  it("muestra datos técnicos correctamente", () => {
    const output: InfoMedicamentoOutput = {
      cum: "1998-M-7823",
      nombre_comercial: "Actron",
      nombre_generico: "Ibuprofeno",
      laboratorio: "Actavis",
      registro_sanitario: "1998M7823",
      forma_farmaceutica: "Tableta",
      concentracion: "400 mg",
      principio_activo: "Ibuprofeno",
      estado_registro: "Vigente",
      fecha_consulta: new Date().toISOString(),
    };

    const resultado = formatearInfoMedicamento(output);

    expect(resultado).toContain("### Datos Técnicos");
    expect(resultado).toContain("- **Principio Activo:** Ibuprofeno");
    expect(resultado).toContain("- **Concentración:** 400 mg");
    expect(resultado).toContain("- **Forma Farmacéutica:** Tableta");
    expect(resultado).toContain("- **Laboratorio:** Actavis");
  });

  it("muestra tabla de registro INVIMA", () => {
    const output: InfoMedicamentoOutput = {
      cum: "1992-M-3456",
      nombre_comercial: "Amoxil",
      nombre_generico: "Amoxicilina",
      laboratorio: "Glaxo Smith Kline",
      registro_sanitario: "1992M3456",
      forma_farmaceutica: "Cápsula",
      concentracion: "500 mg",
      principio_activo: "Amoxicilina",
      estado_registro: "Vigente",
      fecha_consulta: new Date().toISOString(),
    };

    const resultado = formatearInfoMedicamento(output);

    expect(resultado).toContain("### Registro INVIMA");
    expect(resultado).toContain("| CUM | 1992-M-3456 |");
    expect(resultado).toContain("| Registro Sanitario | 1992M3456 |");
    expect(resultado).toContain("| Estado | Vigente |");
  });

  it("muestra precio regulado SISMED cuando está disponible", () => {
    const output: InfoMedicamentoOutput = {
      cum: "1985-M-1111",
      nombre_comercial: "Glucophage",
      nombre_generico: "Metformina",
      laboratorio: "Merck",
      registro_sanitario: "1985M1111",
      forma_farmaceutica: "Tableta",
      concentracion: "500 mg",
      principio_activo: "Metformina",
      precio_regulado_sismed: 800,
      estado_registro: "Vigente",
      fecha_consulta: new Date().toISOString(),
    };

    const resultado = formatearInfoMedicamento(output);

    expect(resultado).toContain("### Precio");
    expect(resultado).toContain("**Precio Regulado SISMED:** $800");
  });

  it("muestra 'No regulado por SISMED' cuando precio no existe", () => {
    const output: InfoMedicamentoOutput = {
      cum: "1992-M-3456",
      nombre_comercial: "Amoxil",
      nombre_generico: "Amoxicilina",
      laboratorio: "Glaxo Smith Kline",
      registro_sanitario: "1992M3456",
      forma_farmaceutica: "Cápsula",
      concentracion: "500 mg",
      principio_activo: "Amoxicilina",
      estado_registro: "Vigente",
      fecha_consulta: new Date().toISOString(),
    };

    const resultado = formatearInfoMedicamento(output);

    expect(resultado).toContain("**Precio Regulado SISMED:** No regulado por SISMED");
  });

  it("incluye advertencia sobre precio regulado", () => {
    const output: InfoMedicamentoOutput = {
      cum: "2000-M-9001",
      nombre_comercial: "Dolex",
      nombre_generico: "Paracetamol",
      laboratorio: "Pharmaceuticals",
      registro_sanitario: "2000M9001",
      forma_farmaceutica: "Tableta",
      concentracion: "500 mg",
      principio_activo: "Paracetamol",
      precio_regulado_sismed: 1200,
      estado_registro: "Vigente",
      fecha_consulta: new Date().toISOString(),
    };

    const resultado = formatearInfoMedicamento(output);

    expect(resultado).toContain("⚠️ Nota:");
    expect(resultado).toContain("**comparar_precios**");
  });

  it("incluye pie de página con fuente INVIMA", () => {
    const output: InfoMedicamentoOutput = {
      cum: "2000-M-9001",
      nombre_comercial: "Dolex",
      nombre_generico: "Paracetamol",
      laboratorio: "Pharmaceuticals",
      registro_sanitario: "2000M9001",
      forma_farmaceutica: "Tableta",
      concentracion: "500 mg",
      principio_activo: "Paracetamol",
      estado_registro: "Vigente",
      fecha_consulta: new Date("2026-03-28T12:00:00Z").toISOString(),
    };

    const resultado = formatearInfoMedicamento(output);

    expect(resultado).toContain("_Información consultada:");
    expect(resultado).toContain("_Fuente: Base de datos INVIMA_ 🇨🇴");
  });
});
