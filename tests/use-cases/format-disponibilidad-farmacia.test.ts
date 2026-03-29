import { describe, it, expect } from "vitest";
import { formatearDisponibilidadFarmacia } from "../../src/use-cases/format-disponibilidad-farmacia.js";
import type { DisponibilidadFarmaciaOutput } from "../../src/use-cases/disponibilidad-farmacia.js";

describe("formatearDisponibilidadFarmacia()", () => {
  it("genera mensaje cuando no hay disponibilidad", () => {
    const resultado: DisponibilidadFarmaciaOutput = {
      medicamento: "paracetamol",
      farmacia_id: "farmatodo",
      farmacia_nombre: "Farmatodo",
      disponible: false,
      timestamp: new Date().toISOString(),
    };

    const texto = formatearDisponibilidadFarmacia(resultado);

    expect(texto).toContain("❌ Sin stock");
    expect(texto).toContain("no está disponible");
    expect(texto).toContain("**Opciones:**");
    expect(texto).toContain("**comparar_precios**");
  });

  it("genera información completa cuando está disponible", () => {
    const resultado: DisponibilidadFarmaciaOutput = {
      medicamento: "ibuprofeno 400mg",
      farmacia_id: "cruz-verde",
      farmacia_nombre: "Cruz Verde",
      disponible: true,
      precio: 9500,
      presentacion: "Caja x 20",
      laboratorio: "Actavis",
      direccion: "Calle 50 #12-34",
      ciudad: "Bogotá",
      telefono: "601-2345678",
      horario: "Lunes a Domingo 7am-10pm",
      timestamp: new Date().toISOString(),
    };

    const texto = formatearDisponibilidadFarmacia(resultado);

    expect(texto).toContain("✅ En stock");
    expect(texto).toContain("$9.500");
    expect(texto).toContain("Caja x 20");
    expect(texto).toContain("Actavis");
    expect(texto).toContain("### Localización");
  });

  it("muestra encabezado con farmacia y medicamento", () => {
    const resultado: DisponibilidadFarmaciaOutput = {
      medicamento: "amoxicilina",
      farmacia_id: "la-rebaja",
      farmacia_nombre: "La Rebaja",
      disponible: true,
      precio: 6500,
      presentacion: "Caja x 12",
      timestamp: new Date().toISOString(),
    };

    const texto = formatearDisponibilidadFarmacia(resultado);

    expect(texto).toContain('## Disponibilidad: "amoxicilina" en La Rebaja');
  });

  it("incluye direccion cuando está disponible", () => {
    const resultado: DisponibilidadFarmaciaOutput = {
      medicamento: "metformina",
      farmacia_id: "locatel",
      farmacia_nombre: "Locatel",
      disponible: true,
      precio: 5000,
      presentacion: "Caja x 30",
      direccion: "Carrera 7 #72-30",
      ciudad: "Medellín",
      timestamp: new Date().toISOString(),
    };

    const texto = formatearDisponibilidadFarmacia(resultado);

    expect(texto).toContain("**Dirección:** Carrera 7 #72-30");
    expect(texto).toContain("**Ciudad:** Medellín");
  });

  it("incluye teléfono y horario cuando están disponibles", () => {
    const resultado: DisponibilidadFarmaciaOutput = {
      medicamento: "aspirina",
      farmacia_id: "colsubsidio",
      farmacia_nombre: "Colsubsidio",
      disponible: true,
      precio: 3000,
      presentacion: "Frasco x 20",
      telefono: "601-9876543",
      horario: "8am-8pm",
      timestamp: new Date().toISOString(),
    };

    const texto = formatearDisponibilidadFarmacia(resultado);

    expect(texto).toContain("**Teléfono:** 601-9876543");
    expect(texto).toContain("**Horario:** 8am-8pm");
  });

  it("incluye link a producto cuando está disponible", () => {
    const resultado: DisponibilidadFarmaciaOutput = {
      medicamento: "dolex",
      farmacia_id: "farmatodo",
      farmacia_nombre: "Farmatodo",
      disponible: true,
      precio: 8500,
      presentacion: "Caja x 10",
      url_producto: "https://farmatodo.com/dolex",
      timestamp: new Date().toISOString(),
    };

    const texto = formatearDisponibilidadFarmacia(resultado);

    expect(texto).toContain("[🔗 Ver en Farmatodo]");
    expect(texto).toContain("https://farmatodo.com/dolex");
  });

  it("omite datos que no estén disponibles", () => {
    const resultado: DisponibilidadFarmaciaOutput = {
      medicamento: "medicamento",
      farmacia_id: "farmatodo",
      farmacia_nombre: "Farmatodo",
      disponible: false,
      timestamp: new Date().toISOString(),
    };

    const texto = formatearDisponibilidadFarmacia(resultado);

    // No debe tener sección de localización si no hay datos
    expect(texto).not.toContain("**Dirección:**");
    expect(texto).not.toContain("**Teléfono:**");
  });

  it("formatea precio con formato es-CO", () => {
    const resultado: DisponibilidadFarmaciaOutput = {
      medicamento: "vitamina",
      farmacia_id: "cruz-verde",
      farmacia_nombre: "Cruz Verde",
      disponible: true,
      precio: 15000,
      presentacion: "Botella",
      timestamp: new Date().toISOString(),
    };

    const texto = formatearDisponibilidadFarmacia(resultado);

    expect(texto).toContain("$15.000");
  });

  it("incluye timestamp en salida final", () => {
    const resultado: DisponibilidadFarmaciaOutput = {
      medicamento: "medicamento",
      farmacia_id: "farmatodo",
      farmacia_nombre: "Farmatodo",
      disponible: true,
      precio: 5000,
      timestamp: new Date("2026-03-28T15:30:00Z").toISOString(),
    };

    const texto = formatearDisponibilidadFarmacia(resultado);

    expect(texto).toContain("_Consultado:");
  });
});
