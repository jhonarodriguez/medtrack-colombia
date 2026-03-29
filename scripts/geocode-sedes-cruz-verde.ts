/**
 * Script para geocodificar las sedes de Cruz Verde en Bogotá usando Nominatim.
 * Uso: npx tsx scripts/geocode-sedes-cruz-verde.ts
 *
 * Genera: src/adapters/sedes/cruz-verde-bogota.ts
 */

import axios from "axios";
import { writeFileSync } from "fs";

interface SedeRaw {
  id: string;
  nombre: string;
  direccion: string;
  horario: string;
}

interface SedeGeo extends SedeRaw {
  coordenadas?: { lat: number; lng: number };
}

// 131 sedes extraídas de https://www.cruzverde.com.co/droguerias/ (Bogotá)
const SEDES_RAW: SedeRaw[] = [
  { id: "Cruz-Verde-Chico", nombre: "Cruz Verde Chicó", direccion: "Carrera 15 # 95 - 84", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Belmira", nombre: "Cruz Verde Belmira", direccion: "Calle 140 # 7 B - 23 Local 102", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Pontevedra", nombre: "Cruz Verde Pontevedra", direccion: "Calle 116 # 71 B - 04", horario: "07:00 a. m. a 06:00 p. m." },
  { id: "Cruz-Verde-Cae", nombre: "Cruz Verde Cae", direccion: "Avenida Carrera 50 # 108 A - 50", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Salitre", nombre: "Cruz Verde Salitre", direccion: "Calle 23 # 66 - 46", horario: "Abierto 24 horas" },
  { id: "Cruz-Verde-Calle-80", nombre: "Cruz Verde Calle 80", direccion: "Carrera 89 A # 80 - 14", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Zona-In", nombre: "Cruz Verde Zona In", direccion: "Calle 13 # 65 - 21", horario: "06:00 a. m. a 06:00 p. m." },
  { id: "Cruz-Verde-Suba", nombre: "Cruz Verde Suba", direccion: "Carrera 91 # 139 - 34 Local 3", horario: "06:00 a. m. a 06:00 p. m." },
  { id: "Cruz-Verde-Santa-Barbara", nombre: "Cruz Verde Santa Bárbara", direccion: "Avenida Carrera 45 # 123 - 14", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Palermo", nombre: "Cruz Verde Palermo", direccion: "Carrera 22 # 45 C - 44 Local 45 C - 50", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Cedro-Bolivar", nombre: "Cruz Verde Cedro Bolívar", direccion: "Avenida 19 # 151 - 75", horario: "Abierto 24 horas" },
  { id: "Cruz-Verde-Calle-106", nombre: "Cruz Verde Calle 106", direccion: "Avenida Carrera 45 # 106 - 76", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Quinta-Paredes", nombre: "Cruz Verde Quinta Paredes", direccion: "Carrera 46 # 22 B - 20", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Calle-127", nombre: "Cruz Verde Calle 127", direccion: "Avenida Calle 127 # 21 - 60 Local 101", horario: "Abierto 24 horas" },
  { id: "Cruz-Verde-Plaza-de-las-Americas", nombre: "Cruz Verde Plaza de las Américas", direccion: "Carrera 71 D # 6 - 94 sur Local 1922", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Calle-72", nombre: "Cruz Verde Calle 72", direccion: "Calle 71 A # 5 - 90", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Calle-97", nombre: "Cruz Verde Calle 97", direccion: "Calle 97 # 23 - 60 Local 5", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Metro-Fontibon", nombre: "Cruz Verde Metro Fontibón", direccion: "Calle 17 # 112 - 58", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Metro-Bosa", nombre: "Cruz Verde Metro Bosa", direccion: "Carrera 92 # 60 - 90 sur", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Metro-Autopista-Sur", nombre: "Cruz Verde Metro Autopista Sur", direccion: "Calle 57 sur # 77 A- 18", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Jumbo-20-de-Julio", nombre: "Cruz Verde Jumbo 20 de Julio", direccion: "Carrera 10 # 30 B - 20 sur", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Jumbo-Suba", nombre: "Cruz Verde Jumbo Suba", direccion: "Calle 146 A # 106 - 20", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Jumbo-Calle-170", nombre: "Cruz Verde Jumbo Calle 170", direccion: "Calle 170 # 64 - 47", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Jumbo-Calle-80", nombre: "Cruz Verde Jumbo Calle 80", direccion: "Avenida Calle 80 # 69 Q - 50", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Calle-54", nombre: "Cruz Verde Calle 54", direccion: "Carrera 13 # 54 – 84", horario: "07:00 a. m. a 06:00 p. m." },
  { id: "Cruz-Verde-Jumbo-Santa-Ana", nombre: "Cruz Verde Jumbo Santa Ana", direccion: "Calle 110 # 9 - 04", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Metro-Banderas", nombre: "Cruz Verde Metro Banderas", direccion: "Calle 6 A # 78 A - 68 sur Local 1017", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Metro-San-Cayetano", nombre: "Cruz Verde Metro San Cayetano", direccion: "Calle 46 A # 85 A - 51", horario: "09:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Jumbo-Hayuelos", nombre: "Cruz Verde Jumbo Hayuelos", direccion: "Carrera 84 # 26 - 50", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Jumbo-Carrera-30", nombre: "Cruz Verde Jumbo Carrera 30", direccion: "Carrera 32 # 18 - 10", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Metro-Alqueria", nombre: "Cruz Verde Metro Alquería", direccion: "Avenida Carrera 68 # 38 - 87 sur", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Centro-Internacional", nombre: "Cruz Verde Centro Internacional", direccion: "Carrera 10 # 26 - 71", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Palatino", nombre: "Cruz Verde Palatino", direccion: "Carrera 7 # 138-33 Local 105", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Santa-fe-2", nombre: "Cruz Verde Santa fé 2", direccion: "Calle 185 # 45 - 43 Local 1-42", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Usaquen", nombre: "Cruz Verde Usaquén", direccion: "Carrera 7 # 120 A - 49", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Toberin", nombre: "Cruz Verde Toberín", direccion: "Calle 166 # 20 - 18", horario: "06:00 a. m. a 06:00 p. m." },
  { id: "Cruz-Verde-Polo-Club", nombre: "Cruz Verde Polo Club", direccion: "Carrera 24 # 86 A - 50", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Ilarco", nombre: "Cruz Verde Ilarco", direccion: "Avenida Suba # 115 - 58 Torre A, Local 103", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Batan", nombre: "Cruz Verde Batán", direccion: "Calle 124 # 45-45", horario: "08:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Avenida-Las-Villas", nombre: "Cruz Verde Avenida Las Villas", direccion: "Carrera 58 # 137 B - 12", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-World-Trade-Center", nombre: "Cruz Verde World Trade Center", direccion: "Calle 100 # 8 A - 49 Local 128", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Puente-Aranda", nombre: "Cruz Verde Puente Aranda", direccion: "Calle 14 # 62 - 18", horario: "Abierto 24 horas" },
  { id: "Cruz-Verde-Restrepo", nombre: "Cruz Verde Restrepo", direccion: "Carrera 18 # 16 - 56 Sur", horario: "06:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Restrepo-3", nombre: "Cruz Verde Restrepo 3", direccion: "Carrera 24 # 18 - 11 sur", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Villa-del-Prado", nombre: "Cruz Verde Villa del Prado", direccion: "Carrera 55 # 170 A - 35 Local 16-17", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Niza", nombre: "Cruz Verde Niza", direccion: "Avenida Calle 127 # 60 - 02 Local 09", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Salitre-2", nombre: "Cruz Verde Salitre 2", direccion: "Avenida Calle 24 # 69 A - 59 Local 11", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Calle-140-2", nombre: "Cruz Verde Calle 140-2", direccion: "Calle 140 # 12 B - 86", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Las-Villas", nombre: "Cruz Verde Las Villas", direccion: "Carrera 58 # 129 - 15 Esquina", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Bulevar-Niza", nombre: "Cruz Verde Bulevar Niza", direccion: "Carrera 58 # 128 A - 97", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Unicentro-Occidente", nombre: "Cruz Verde Unicentro Occidente", direccion: "Carrera 111 C # 86 - 05 Local 1-41", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Pablo-VI", nombre: "Cruz Verde Pablo VI", direccion: "Carrera 53 # 53 - 63 Bloque 1 - Local 9", horario: "07:00 a. m. a 10:00 a. m." },
  { id: "Cruz-Verde-La-Colina-2", nombre: "Cruz Verde La Colina 2", direccion: "Carrera 59 # 152 B - 75 Local 115", horario: "08:00 a. m. a 10:00 p. m." },
  { id: "Cruz-Verde-Tintalito", nombre: "Cruz Verde Tintalito", direccion: "Carrera 86 B # 42 B - 54 sur Local 105-106", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Santa-Matilde", nombre: "Cruz Verde Santa Matilde", direccion: "Calle 8 sur # 35 A - 44", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Modelia", nombre: "Cruz Verde Modelia", direccion: "Carrera 80 B # 24 C - 26", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Chico-2", nombre: "Cruz Verde Chicó 2", direccion: "Carrera 15 # 88 - 59", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Chapinero", nombre: "Cruz Verde Chapinero", direccion: "Calle 67 # 11 - 73", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Avenida-El-Dorado", nombre: "Cruz Verde Avenida El Dorado", direccion: "Calle 26 # 39 - 35", horario: "08:00 a. m. a 06:00 p. m." },
  { id: "Cruz-Verde-Castilla", nombre: "Cruz Verde Castilla", direccion: "Carrera 78 # 8 - 54 Local 2", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Ibiza", nombre: "Cruz Verde Ibiza", direccion: "Calle 147 # 7 F - 13 Local 2", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Ciudad-Montes", nombre: "Cruz Verde Ciudad Montes", direccion: "Calle 8 sur # 39 - 05", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Puente-Largo", nombre: "Cruz Verde Puente Largo", direccion: "Avenida Suba # 106 B - 06", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Salitre-Plaza", nombre: "Cruz Verde Salitre Plaza", direccion: "Carrera 68 B # 24 - 39 Local 174", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Plaza-Bolivar", nombre: "Cruz Verde Plaza Bolívar", direccion: "Carrera 8 # 11 - 37", horario: "07:00 a. m. a 05:00 p. m." },
  { id: "Cruz-Verde-Colina", nombre: "Cruz Verde Colina", direccion: "Carrera 58 D # 146 - 51 Local 301", horario: "09:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Kennedy-Central", nombre: "Cruz Verde Kennedy Central", direccion: "Calle 40 sur # 73 D - 41", horario: "06:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Las-Ferias", nombre: "Cruz Verde Las Ferias", direccion: "Avenida Calle 72 # 78 - 03", horario: "08:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Santa-fe", nombre: "Cruz Verde Santa fé", direccion: "Calle 185 # 45 - 43 Local 2 - 50", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Avenida-Esperanza", nombre: "Cruz Verde Avenida Esperanza", direccion: "Calle 23 B # 68 C - 40 Local 11", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Restrepo-Carrera-17", nombre: "Cruz Verde Restrepo Carrera 17", direccion: "Carrera 17 # 17 - 31 sur", horario: "06:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Calle-93", nombre: "Cruz Verde Calle 93", direccion: "Carrera 11 # 93 - 93", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Calle-140", nombre: "Cruz Verde Calle 140", direccion: "Calle 140 # 17 A - 45", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Modelia-Central", nombre: "Cruz Verde Modelia Central", direccion: "Carrera 75 # 23 G - 10", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Clinica-de-la-Mujer", nombre: "Cruz Verde Clínica de la Mujer", direccion: "Carrera 19 C # 91 - 63", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Medical-Center", nombre: "Cruz Verde Medical Center", direccion: "Avenida Carrera 9 # 127 B - 16", horario: "08:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Plaza-Imperial", nombre: "Cruz Verde Plaza Imperial", direccion: "Avenida 104 # 148 - 07 Local 2-02", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Calle-184", nombre: "Cruz Verde Calle 184", direccion: "Autopista Norte # 183 A - 86 Local 108", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Uap-104", nombre: "Cruz Verde Uap 104", direccion: "Carrera 19 # 104 - 37 Local 2", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Santa-Bibiana", nombre: "Cruz Verde Santa Bibiana", direccion: "Avenida Carrera 15 # 118 - 28", horario: "08:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Diver-Plaza", nombre: "Cruz Verde Diver Plaza", direccion: "Transversal 99 # 70 A - 89 Local 179", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Mazuren", nombre: "Cruz Verde Mazurén", direccion: "Calle 151 # 54 - 15 Local 11", horario: "06:30 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Parque-Fontibon", nombre: "Cruz Verde Parque Fontibón", direccion: "Carrera 99 # 18 A - 18", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Country-Urgencias", nombre: "Cruz Verde Country Urgencias", direccion: "Calle 83 # 16 A - 10", horario: "Abierto 24 horas" },
  { id: "Cruz-Verde-Torre-Central", nombre: "Cruz Verde Torre Central", direccion: "Carrera 68 D # 25 B - 86 Local 1-17", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Panorama", nombre: "Cruz Verde Panorama", direccion: "Calle 31 # 13 A - 51 Torre 2 - Local 15", horario: "08:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-San-Jose", nombre: "Cruz Verde San José", direccion: "Transversal 4 Este # 37-02 Sur", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Palermo-Carrera-24", nombre: "Cruz Verde Palermo Carrera 24", direccion: "Carrera 24 # 45 B - 46", horario: "08:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Calle-49", nombre: "Cruz Verde Calle 49", direccion: "Avenida Caracas # 49 - 21", horario: "08:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Concor", nombre: "Cruz Verde Concor", direccion: "Carrera 16 # 51 - 09", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Concor-2", nombre: "Cruz Verde Concor 2", direccion: "Carrera 16 # 51 - 99", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Supervillas-2", nombre: "Cruz Verde Supervillas 2", direccion: "Carrera 27 # 51- 09", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Calle-52", nombre: "Cruz Verde Calle 52", direccion: "Carrera 7 # 52 - 23 Local 1", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Calle-122", nombre: "Cruz Verde Calle 122", direccion: "Calle 122 # 15 - 24", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Ciudad-Empresarial", nombre: "Cruz Verde Ciudad Empresarial", direccion: "Avenida Calle 26 # 59 - 41 Torre 3 - Local 104", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-La-Cosecha", nombre: "Cruz Verde La Cosecha", direccion: "Calle 127 B # 50 A - 65", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Portoalegre", nombre: "Cruz Verde Portoalegre", direccion: "Carrera 58 #137 - 12", horario: "Abierto 24 horas" },
  { id: "Cruz-Verde-Belmira-Plaza", nombre: "Cruz Verde Belmira Plaza", direccion: "Calle 140 # 7 - 52 Local 113", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Montearroyo-1", nombre: "Cruz Verde Montearroyo 1", direccion: "Carrera 7 A # 140 - 56 Local 101-102", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Montearroyo-2", nombre: "Cruz Verde Montearroyo 2", direccion: "Calle 140 # 11 - 01", horario: "Abierto 24 horas" },
  { id: "Cruz-Verde-Vision-Vivir", nombre: "Cruz Verde Visión Vivir", direccion: "Calle 140 # 9 - 30 Local 5", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Montearroyo-Principal", nombre: "Cruz Verde Montearroyo Principal", direccion: "Calle 147 # 13 - 07", horario: "Abierto 24 horas" },
  { id: "Cruz-Verde-Centro-Empresarial-Vardi", nombre: "Cruz Verde Centro Empresarial Vardi", direccion: "Calle 98 # 70 - 91 Local 18", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Torres-de-San-Jose", nombre: "Cruz Verde Torres de San José", direccion: "Carrera 7 # 82 - 62 Local 21", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Plaza-Central", nombre: "Cruz Verde Plaza Central", direccion: "Carrera 65 # 11 - 50 Local 3 - 81", horario: "07:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Centro-Medico-la-Sabana", nombre: "Cruz Verde Centro Médico la Sabana", direccion: "Carrera 7 # 119 - 08 Local 101-102", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Portal-80", nombre: "Cruz Verde Portal 80", direccion: "Transversal 100 A # 80 A - 20 Local 36", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Acomedica", nombre: "Cruz Verde Acomédica", direccion: "Avenida Calle 127 # 19 A - 10", horario: "06:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Metropolis", nombre: "Cruz Verde Metrópolis", direccion: "Carrera 68 # 75 A - 50 Local 121", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Normandia", nombre: "Cruz Verde Normandía", direccion: "Avenida Boyacá # 53 - 57", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Carrera-15", nombre: "Cruz Verde Carrera 15", direccion: "Calle 83 # 14 A - 25 Local 3", horario: "Abierto 24 horas" },
  { id: "Cruz-Verde-La-Carolina", nombre: "Cruz Verde La Carolina", direccion: "Calle 127 # 14 - 54 Local 101", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Calle-136", nombre: "Cruz Verde Calle 136", direccion: "Avenida Carrera 19 # 135 - 29", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Primera-de-Mayo", nombre: "Cruz Verde Primera de Mayo", direccion: "Calle 22 sur # 10 A - 16 Local 102", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Avenida-Chile", nombre: "Cruz Verde Avenida Chile", direccion: "Calle 72 # 10 - 34 Local 128", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Valparaiso", nombre: "Cruz Verde Valparaíso", direccion: "Calle 72 # 10 - 87", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Calle-161", nombre: "Cruz Verde Calle 161", direccion: "Carrera 14 B # 161 - 54 Local 1", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Carrera-11", nombre: "Cruz Verde Carrera 11", direccion: "Carrera 11 # 98 - 04 Local 3", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Unicentro", nombre: "Cruz Verde Unicentro", direccion: "Avenida Carrera 15 # 124 - 30 Local 2087", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Carrera-90", nombre: "Cruz Verde Carrera 90", direccion: "Carrera 90 A # 76 A - 74", horario: "06:00 a. m. a 06:00 p. m." },
  { id: "Cruz-Verde-Bahia", nombre: "Cruz Verde Bahía", direccion: "Transversal 60 # 124 - 14 Local 80", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Alcala", nombre: "Cruz Verde Alcalá", direccion: "Calle 137 # 45 - 23", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Carrera-13", nombre: "Cruz Verde Carrera 13", direccion: "Carrera 13 # 57 - 08", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Calle-148", nombre: "Cruz Verde Calle 148", direccion: "Carrera 19 # 148 - 12", horario: "07:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Jardin-Plaza", nombre: "Cruz Verde Jardín Plaza", direccion: "Calle 122 # 17 - 85", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-La-Esmeralda", nombre: "Cruz Verde La Esmeralda", direccion: "Calle 44 # 57 A - 44", horario: "06:30 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Calle-95", nombre: "Cruz Verde Calle 95", direccion: "Calle 95 # 13 - 81 Local 2", horario: "08:00 a. m. a 07:00 p. m." },
  { id: "Cruz-Verde-Centro-Mayor", nombre: "Cruz Verde Centro Mayor", direccion: "Calle 38 A sur # 34 D - 51 Segundo piso Local 2018", horario: "08:00 a. m. a 09:00 p. m." },
  { id: "Cruz-Verde-Quirigua", nombre: "Cruz Verde Quiriguá", direccion: "Transversal 94 # 80 A - 49", horario: "08:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Parque-Lourdes", nombre: "Cruz Verde Parque Lourdes", direccion: "Carrera 13 # 62 - 30", horario: "07:00 a. m. a 08:00 p. m." },
  { id: "Cruz-Verde-Ed-Zentai", nombre: "Cruz Verde Ed. Zentai", direccion: "Carrera 23 # 124 - 87 Local 5", horario: "07:00 a. m. a 08:00 p. m." },
];

/** Convierte dirección colombiana a formato más geocodificable */
function normalizarDireccion(dir: string): string {
  return dir
    .replace(/Local\s+[\w\s-]+/gi, "")
    .replace(/Bloque\s+[\w\s-]+/gi, "")
    .replace(/Torre\s+[\w\s]+/gi, "")
    .replace(/Segundo piso/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function geocodificar(sede: SedeRaw): Promise<SedeGeo> {
  const query = `${normalizarDireccion(sede.direccion)}, Bogotá, Colombia`;
  try {
    const resp = await axios.get<Array<{ lat: string; lon: string; display_name: string }>>(
      "https://nominatim.openstreetmap.org/search",
      {
        params: { q: query, format: "json", limit: 1, countrycodes: "co" },
        headers: {
          "User-Agent": "mcp-medicamentos-colombia/1.0 (geocode-script)",
          "Accept-Language": "es",
        },
        timeout: 10000,
      }
    );
    if (resp.data.length > 0) {
      return {
        ...sede,
        coordenadas: {
          lat: parseFloat(resp.data[0].lat),
          lng: parseFloat(resp.data[0].lon),
        },
      };
    }
  } catch (e) {
    console.warn(`  ⚠ Error geocodificando ${sede.nombre}: ${(e as Error).message}`);
  }
  return sede;
}

async function main() {
  console.log(`Geocodificando ${SEDES_RAW.length} sedes de Cruz Verde en Bogotá...`);
  console.log("(1 request/seg para respetar ToS de Nominatim)\n");

  const results: SedeGeo[] = [];
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < SEDES_RAW.length; i++) {
    const sede = SEDES_RAW[i];
    process.stdout.write(`[${i + 1}/${SEDES_RAW.length}] ${sede.nombre}... `);
    const result = await geocodificar(sede);
    results.push(result);
    if (result.coordenadas) {
      console.log(`✓ (${result.coordenadas.lat.toFixed(4)}, ${result.coordenadas.lng.toFixed(4)})`);
      ok++;
    } else {
      console.log(`✗ sin coordenadas`);
      fail++;
    }
    // Rate limit: 1 req/seg
    if (i < SEDES_RAW.length - 1) await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`\nResultado: ${ok} con coordenadas, ${fail} sin coordenadas\n`);

  // Generar TypeScript
  const ts = `import type { PharmacyLocation } from "../../types/index.js";

// Sedes de Cruz Verde en Bogotá
// Fuente: https://www.cruzverde.com.co/droguerias/ (${new Date().toISOString().split("T")[0]})
// Coordenadas: Nominatim / OpenStreetMap
export const SEDES_CRUZ_VERDE_BOGOTA: PharmacyLocation[] = ${JSON.stringify(
    results.map((s, i) => ({
      id: `cruz-verde-bogota-${i + 1}`,
      nombre: s.nombre,
      direccion: s.direccion,
      ciudad: "Bogotá",
      horario: s.horario,
      ...(s.coordenadas ? { coordenadas: s.coordenadas } : {}),
    })),
    null,
    2
  )};
`;

  const outPath = new URL("../src/adapters/sedes/cruz-verde-bogota.ts", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
  writeFileSync(outPath, ts, "utf-8");
  console.log(`Archivo generado: src/adapters/sedes/cruz-verde-bogota.ts`);
}

main().catch(console.error);
