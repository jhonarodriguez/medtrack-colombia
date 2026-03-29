import type { InfoMedicamentoInput } from "../tools/schemas.js";

interface InvimaMedicamento {
  cum: string;
  nombre_comercial: string;
  nombre_generico: string;
  laboratorio: string;
  registro_sanitario: string;
  forma_farmaceutica: string;
  concentracion: string;
  principio_activo: string;
  precio_regulado_sismed?: number;
}

const INVIMA_DATABASE: Record<string, InvimaMedicamento> = {
  "paracetamol": {
    cum: "2000-M-9001",
    nombre_comercial: "Dolex",
    nombre_generico: "Paracetamol",
    laboratorio: "Pharmaceuticals",
    registro_sanitario: "2000M9001",
    forma_farmaceutica: "Tableta",
    concentracion: "500 mg",
    principio_activo: "Paracetamol",
    precio_regulado_sismed: 1200,
  },
  "ibuprofeno": {
    cum: "1998-M-7823",
    nombre_comercial: "Actron",
    nombre_generico: "Ibuprofeno",
    laboratorio: "Actavis",
    registro_sanitario: "1998M7823",
    forma_farmaceutica: "Tableta",
    concentracion: "400 mg",
    principio_activo: "Ibuprofeno",
    precio_regulado_sismed: 2500,
  },
  "acetaminofén": {
    cum: "2000-M-9001",
    nombre_comercial: "Tafirol",
    nombre_generico: "Acetaminofén",
    laboratorio: "Sanofi",
    registro_sanitario: "2000M9001",
    forma_farmaceutica: "Tableta",
    concentracion: "500 mg",
    principio_activo: "Acetaminofén",
    precio_regulado_sismed: 1200,
  },
  "amoxicilina": {
    cum: "1992-M-3456",
    nombre_comercial: "Amoxil",
    nombre_generico: "Amoxicilina",
    laboratorio: "Glaxo Smith Kline",
    registro_sanitario: "1992M3456",
    forma_farmaceutica: "Cápsula",
    concentracion: "500 mg",
    principio_activo: "Amoxicilina",
  },
  "metformina": {
    cum: "1985-M-1111",
    nombre_comercial: "Glucophage",
    nombre_generico: "Metformina",
    laboratorio: "Merck",
    registro_sanitario: "1985M1111",
    forma_farmaceutica: "Tableta",
    concentracion: "500 mg",
    principio_activo: "Metformina",
    precio_regulado_sismed: 800,
  },
};

export interface InfoMedicamentoOutput {
  cum: string;
  nombre_comercial: string;
  nombre_generico: string;
  laboratorio: string;
  registro_sanitario: string;
  forma_farmaceutica: string;
  concentracion: string;
  principio_activo: string;
  precio_regulado_sismed?: number;
  estado_registro: "Vigente";
  fecha_consulta: string;
}

/**
 * Use case para obtener información oficial de medicamentos registrados en INVIMA.
 * Consulta base de datos local (MVP) o podría integrar API de INVIMA en futuro.
 *
 * Responsabilidades (SRP):
 * - Recibir nombre del medicamento (y CUM opcional)
 * - Buscar en base de datos local o registros INVIMA
 * - Retornar información oficial: registro, laboratorio, principio activo, precio
 */
export class InfoMedicamentoUseCase {
  async execute(input: InfoMedicamentoInput): Promise<InfoMedicamentoOutput | null> {
    // Buscar por CUM si se proporciona (más preciso)
    if (input.cum) {
      const por_cum = Object.values(INVIMA_DATABASE).find((m) => m.cum === input.cum);
      if (por_cum) {
        return this.mapearAlOutput(por_cum);
      }
      // Si el CUM no existe, continuar buscando por nombre
    }

    // Buscar por nombre genérico o comercial (normalizado)
    const nombreNormalizado = this.normalizar(input.nombre);
    const medication = this.buscarEnBase(nombreNormalizado);

    if (!medication) {
      return null;
    }

    return this.mapearAlOutput(medication);
  }

  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .trim()
      .replace(/á|à|ä/g, "a")
      .replace(/é|è|ë/g, "e")
      .replace(/í|ì|ï/g, "i")
      .replace(/ó|ò|ö/g, "o")
      .replace(/ú|ù|ü/g, "u");
  }

  private buscarEnBase(nombreNormalizado: string): InvimaMedicamento | undefined {
    // Búsqueda en la base de datos
    for (const [clave, med] of Object.entries(INVIMA_DATABASE)) {
      if (clave.includes(nombreNormalizado) || nombreNormalizado.includes(clave)) {
        return med;
      }
      // También buscar en nombres comerciales y genéricos
      if (
        this.normalizar(med.nombre_comercial).includes(nombreNormalizado) ||
        this.normalizar(med.nombre_generico).includes(nombreNormalizado)
      ) {
        return med;
      }
    }
    return undefined;
  }

  private mapearAlOutput(med: InvimaMedicamento): InfoMedicamentoOutput {
    return {
      cum: med.cum,
      nombre_comercial: med.nombre_comercial,
      nombre_generico: med.nombre_generico,
      laboratorio: med.laboratorio,
      registro_sanitario: med.registro_sanitario,
      forma_farmaceutica: med.forma_farmaceutica,
      concentracion: med.concentracion,
      principio_activo: med.principio_activo,
      precio_regulado_sismed: med.precio_regulado_sismed,
      estado_registro: "Vigente",
      fecha_consulta: new Date().toISOString(),
    };
  }
}

export const infoMedicamentoUseCase = new InfoMedicamentoUseCase();
