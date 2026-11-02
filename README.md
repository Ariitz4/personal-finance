# Personal Finance

Aplicación web personal de finanzas con arquitectura **local-first**. Está pensada para una sola persona y para utilizarse principalmente desde el móvil. No requiere Supabase, servidor propio, registro, autenticación ni una base de datos en la nube.

## Funcionalidades incluidas

### Finanzas personales
- Dashboard con patrimonio registrado, ingresos, gastos, ahorro y tasa de ahorro.
- Cuentas iniciales CaixaBank, Revolut y MyInvestor, sin saldos ficticios.
- Movimientos: ingresos, gastos, reembolsos, comisiones y ajustes; búsqueda, filtros, edición, eliminación y CSV.
- Transferencias internas que afectan a los saldos de las cuentas, pero no a ingresos ni gastos.
- Conciliación de saldos mediante ajustes identificables.
- Presupuestos mensuales por categoría.
- Objetivos de ahorro.

### Inversiones
- Catálogo de fondos identificado preferentemente por ISIN y broker.
- Registro de compras, ventas, traspasos, dividendos, reinversiones, comisiones, retenciones y correcciones.
- Cálculo de participaciones, coste de adquisición mediante coste medio ponderado y resultado no realizado.
- Rentabilidad XIRR estimada a partir de los flujos registrados y valoración final.
- Rentabilidad TWR a partir de snapshots de cartera y flujos externos indicados por el usuario.
- Registro manual del valor liquidativo y fuente de cada valoración.
- Importación de históricos de precios CSV con columnas ISIN, Fecha y Precio/VL.
- Historial de operaciones, valoraciones y snapshots.

### Importación, asistente e informes
- Importador bancario CSV con detección de delimitador, asignación de columnas, previsualización y detección de duplicados.
- No transforma extractos de MyInvestor automáticamente en operaciones de fondos: deben revisarse y registrarse en el módulo de inversiones.
- Asistente local de registro en lenguaje natural. Interpreta expresiones sencillas y prepara un movimiento u operación para revisión y confirmación; funciona mediante reglas locales, **no es un modelo generativo de IA**.
- Informes de ingresos, gastos, categorías y actividad de los últimos 12 meses.
- Evolución del patrimonio mediante snapshots diarios que se actualizan al cambiar los datos y abrir la aplicación.
- Exportación CSV y vista de impresión del navegador, desde la que se puede guardar como PDF.

### Privacidad y almacenamiento
- IndexedDB para datos financieros y LocalStorage para preferencias de interfaz.
- Copia de seguridad y restauración completa en JSON.
- PWA instalable y shell disponible offline después de la primera carga.
- Diseño responsive y modo claro/oscuro.

## Límites importantes

- Los datos permanecen en el navegador del dispositivo. No hay sincronización entre móviles u ordenadores.
- IndexedDB no cifra por sí mismo la información. Protege el dispositivo con bloqueo de pantalla y guarda las copias JSON en un lugar seguro.
- No se realizan conexiones bancarias ni se almacenan credenciales bancarias.
- Las cotizaciones automáticas semanales en segundo plano no son posibles con GitHub Pages y una aplicación local sin backend. Introduce valoraciones manualmente o importa un CSV de precios. La fecha y la fuente quedan registradas.
- El asistente conversacional es un parser local determinista, no una IA generativa. Una IA real requiere un proveedor externo y enviaría el texto que se le facilite a ese proveedor; se mantiene fuera para respetar el enfoque privado/offline.
- XIRR y TWR son métricas de seguimiento, no cálculos fiscales. El TWR depende de snapshots y flujos externos introducidos correctamente. El coste medio ponderado no equivale necesariamente al cálculo fiscal español.
- Los fondos sin una valoración registrada no se suman al patrimonio de mercado.
- Para dividendos pagados en efectivo, registra también el ingreso en la cuenta donde se reciben. Para dividendos reinvertidos, registra la operación como reinversión; evita registrar el mismo efectivo dos veces.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm

## Desarrollo local

```bash
npm install
npm run dev
```

## Comprobaciones

```bash
npm run build
npm test
```

## Publicar en GitHub Pages

1. Sube el contenido del proyecto a un repositorio GitHub.
2. En `vite.config.ts`, cambia `base: '/personal-finance/'` si el repositorio tiene otro nombre.
3. En GitHub, abre Settings → Pages y selecciona GitHub Actions como origen.
4. El workflow `.github/workflows/deploy.yml` construye y publica el frontend al hacer push a `main`.
5. Abre la URL publicada en el móvil y añádela a la pantalla de inicio.

GitHub aloja los archivos de la aplicación; no recibe los movimientos ni las cuentas almacenadas en IndexedDB.

## Copias de seguridad

En Ajustes puedes exportar los datos a un archivo JSON. Hazlo con regularidad y antes de borrar los datos del navegador, cambiar de móvil o reinstalar la aplicación. Para migrar, abre la app en el nuevo dispositivo y restaura el archivo.

## Estructura

```text
src/
  App.tsx                 Aplicación y navegación
  Advanced.tsx            Inversiones, importación, asistente e informes
  main.tsx
  styles.css
  lib/
    finance.ts            Modelo y cálculos financieros
    db.ts                 Persistencia IndexedDB
public/
  manifest.webmanifest
  service-worker.js
  icon.svg
  icon-192.png
  icon-512.png
tests/
  finance.test.ts
```
