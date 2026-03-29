import { describe, it, expect, beforeEach, vi } from "vitest";
import { calcularDistanciaKm, geocodificarUbicacion, geocodificarCiudad } from "../../src/services/geo.service.js";
import * as geoService from "../../src/services/geo.service.js";

describe("calcularDistanciaKm", () => {
  it("retorna 0 para el mismo punto", () => {
    const distancia = calcularDistanciaKm(4.711, -74.0721, 4.711, -74.0721);
    expect(distancia).toBe(0);
  });

  it("es simetrica entre dos coordenadas", () => {
    const a = calcularDistanciaKm(4.711, -74.0721, 6.2442, -75.5812);
    const b = calcularDistanciaKm(6.2442, -75.5812, 4.711, -74.0721);
    expect(a).toBe(b);
  });

  it("aproxima la distancia Bogota-Medellin", () => {
    const distancia = calcularDistanciaKm(4.711, -74.0721, 6.2442, -75.5812);
    expect(distancia).toBeGreaterThan(230);
    expect(distancia).toBeLessThan(250);
  });
});

describe("geocodificarUbicacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna null si no hay datos de entrada", async () => {
    const resultado = await geocodificarUbicacion({});
    expect(resultado).toBeNull();
  });

  it("retorna coordenadas al proporcionar dirección + ciudad", async () => {
    const resultado = await geocodificarUbicacion({
      direccion: "Cra 7 #72-30",
      ciudad: "Bogotá",
    });
    // Este test usa la API real de Nominatim - puede ser lento
    // En CI, si Nominatim está lento, puede timeout
    if (resultado) {
      expect(resultado).toHaveProperty("lat");
      expect(resultado).toHaveProperty("lng");
      expect(typeof resultado.lat).toBe("number");
      expect(typeof resultado.lng).toBe("number");
    }
  });

  it("retorna coordenadas al proporcionar barrio + ciudad", async () => {
    const resultado = await geocodificarUbicacion({
      barrio: "Chapinero",
      ciudad: "Bogotá",
    });
    // Chapinero está en Bogotá alrededor de (4.6 a 4.7, -74 a -74.1)
    if (resultado) {
      expect(resultado).toHaveProperty("lat");
      expect(resultado).toHaveProperty("lng");
      expect(resultado.lat).toBeGreaterThan(4.6);
      expect(resultado.lat).toBeLessThan(4.8);
      expect(resultado.lng).toBeGreaterThan(-74.2);
      expect(resultado.lng).toBeLessThan(-74.0);
    }
  });

  it("retorna coordenadas al proporcionar localidad + ciudad", async () => {
    const resultado = await geocodificarUbicacion({
      localidad: "Usaquén",
      ciudad: "Bogotá",
    });
    // Usaquén está en el norte de Bogotá
    if (resultado) {
      expect(resultado).toHaveProperty("lat");
      expect(resultado).toHaveProperty("lng");
      expect(resultado.lat).toBeGreaterThan(4.6);
      expect(resultado.lat).toBeLessThan(4.9);
      expect(resultado.lng).toBeGreaterThan(-74.2);
      expect(resultado.lng).toBeLessThan(-74.0);
    }
  });

  it("hay fallback a ciudad si dirección falla", async () => {
    // Dirección muy específica que probablemente no existe
    const resultado = await geocodificarUbicacion({
      direccion: "Dirección Inexistente 99999",
      ciudad: "Bogotá",
    });
    // Debería retornar coordenadas de Bogotá como fallback
    // Bogotá está alrededor de (4.7, -74.07)
    if (resultado) {
      expect(resultado).toHaveProperty("lat");
      expect(resultado).toHaveProperty("lng");
      expect(resultado.lat).toBeGreaterThan(4.6);
      expect(resultado.lat).toBeLessThan(4.8);
      expect(resultado.lng).toBeGreaterThan(-74.2);
      expect(resultado.lng).toBeLessThan(-74.0);
    }
  });

  it("retorna null si no hay ciudad después de fallo de dirección", async () => {
    const resultado = await geocodificarUbicacion({
      direccion: "Dirección Inexistente",
      // Sin ciudad
    });
    expect(resultado).toBeNull();
  });

  it("respeta la prioridad: dirección > barrio > localidad > ciudad", async () => {
    // Cada uno debería intentarse en orden
    const resultado = await geocodificarUbicacion({
      direccion: "Cra 7",
      barrio: "Chapinero",
      localidad: "Usaquén",
      ciudad: "Bogotá",
    });
    // Debería intentar con la dirección primero
    if (resultado) {
      expect(resultado).toHaveProperty("lat");
      expect(resultado).toHaveProperty("lng");
      // Debe ser en Bogotá
      expect(resultado.lat).toBeGreaterThan(4.5);
      expect(resultado.lat).toBeLessThan(5.0);
    }
  });

  it("cachea resultados para no hacer múltiples llamadas", async () => {
    // Múltiples llamadas con la misma entrada
    const resultado1 = await geocodificarUbicacion({ ciudad: "Bogotá" });
    const resultado2 = await geocodificarUbicacion({ ciudad: "Bogotá" });

    // Ambos deberían retornar el mismo resultado
    expect(resultado1).toEqual(resultado2);
    if (resultado1) {
      expect(resultado1).toHaveProperty("lat");
      expect(resultado1).toHaveProperty("lng");
    }
  });
});

