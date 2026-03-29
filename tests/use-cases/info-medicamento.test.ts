import { describe, it, expect, beforeEach } from "vitest";
import { InfoMedicamentoUseCase } from "../../src/use-cases/info-medicamento.js";

describe("InfoMedicamentoUseCase", () => {
  let useCase: InfoMedicamentoUseCase;

  beforeEach(() => {
    useCase = new InfoMedicamentoUseCase();
  });

  describe("execute()", () => {
    it("retorna información de medicamento por nombre genérico", async () => {
      const resultado = await useCase.execute({ nombre: "paracetamol" });

      expect(resultado).toBeDefined();
      expect(resultado?.nombre_generico).toBe("Paracetamol");
      expect(resultado?.nombre_comercial).toBe("Dolex");
      expect(resultado?.laboratorio).toBeDefined();
      expect(resultado?.cum).toBe("2000-M-9001");
    });

    it("retorna información por nombre genérico normalizado (sin tildes)", async () => {
      const resultado = await useCase.execute({ nombre: "acetaminofen" });

      expect(resultado).toBeDefined();
      expect(resultado?.nombre_generico).toBe("Acetaminofén");
      expect(resultado?.nombre_comercial).toBe("Tafirol");
    });

    it("busca por nombre comercial", async () => {
      const resultado = await useCase.execute({ nombre: "dolex" });

      expect(resultado).toBeDefined();
      expect(resultado?.nombre_comercial).toBe("Dolex");
      expect(resultado?.nombre_generico).toBe("Paracetamol");
    });

    it("busca por nombre comercial normalizado (mayúsculas)", async () => {
      const resultado = await useCase.execute({ nombre: "ACTRON" });

      expect(resultado).toBeDefined();
      expect(resultado?.nombre_comercial).toBe("Actron");
      expect(resultado?.principio_activo).toBe("Ibuprofeno");
    });

    it("retorna null si medicamento no existe", async () => {
      const resultado = await useCase.execute({ nombre: "medicamento inexistente" });

      expect(resultado).toBeNull();
    });

    it("incluye información INVIMA completa: principio activo, concentración, forma farmacéutica", async () => {
      const resultado = await useCase.execute({ nombre: "amoxicilina" });

      expect(resultado).toBeDefined();
      expect(resultado?.principio_activo).toBe("Amoxicilina");
      expect(resultado?.concentracion).toBe("500 mg");
      expect(resultado?.forma_farmaceutica).toBe("Cápsula");
      expect(resultado?.registro_sanitario).toBeDefined();
    });

    it("incluye precio regulado SISMED cuando está disponible", async () => {
      const resultado = await useCase.execute({ nombre: "metformina" });

      expect(resultado).toBeDefined();
      expect(resultado?.precio_regulado_sismed).toBe(800);
    });

    it("no incluye precio regulado SISMED cuando no está disponible", async () => {
      const resultado = await useCase.execute({ nombre: "amoxicilina" });

      expect(resultado).toBeDefined();
      expect(resultado?.precio_regulado_sismed).toBeUndefined();
    });

    it("retorna estado_registro siempre como 'Vigente'", async () => {
      const resultado = await useCase.execute({ nombre: "paracetamol" });

      expect(resultado?.estado_registro).toBe("Vigente");
    });

    it("incluye fecha_consulta en ISO format", async () => {
      const resultado = await useCase.execute({ nombre: "ibuprofeno" });

      expect(resultado?.fecha_consulta).toBeDefined();
      const fecha = new Date(resultado!.fecha_consulta);
      expect(fecha.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it("busca por CUM cuando se proporciona", async () => {
      const resultado = await useCase.execute({ nombre: "cualquier", cum: "1985-M-1111" });

      expect(resultado).toBeDefined();
      expect(resultado?.nombre_generico).toBe("Metformina");
    });

    it("fallback a búsqueda por nombre si CUM no existe", async () => {
      const resultado = await useCase.execute({ nombre: "paracetamol", cum: "9999-X-0000" });

      expect(resultado).toBeDefined();
      expect(resultado?.nombre_generico).toBe("Paracetamol");
    });
  });
});
