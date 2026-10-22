# ELI Guidance Lab — demo descargable

Este paquete contiene la versión de la demo con spotlight de bordes difuminados, fondo oscuro con blur y transiciones suaves.

## Ejecutar en tu computadora

1. Descomprimí el ZIP.
2. Abrí una terminal dentro de la carpeta `eli-guidance-lab`.
3. Ejecutá:

```bash
# Servir el prototipo estático; requiere Python 3.
python3 -m http.server 4173 --directory dist
```

4. Abrí `http://localhost:4173` en tu navegador.
5. Usá «Iniciar recorrido» para comenzar.

El prototipo usa módulos JavaScript: abrilo mediante el servidor local, no con doble clic sobre `index.html`.

## Archivos

- `dist/index.html`: interfaz de ELI Desk con datos ficticios.
- `dist/styles.css`: estilos del escritorio de demostración.
- `dist/app.js`: navegación, filtros, detalles y reclamos temporales.
- `dist/spotlight-tour.js`: motor reutilizable del recorrido.
- `dist/spotlight-tour.css`: estilos del recorrido.
- `README.md`: configuración y reutilización del add-on.
- `QA.md`: verificaciones de interacción realizadas.

Los reclamos creados se mantienen en memoria hasta recargar la página. El estado de cierre del recorrido se registra localmente en el navegador.

## Integrar en otro sistema

Copiá `spotlight-tour.js` y `spotlight-tour.css`, cargá los estilos y configurá los selectores, títulos y textos de cada paso; el ejemplo de `README.md` muestra la API.

La privacidad del sitio alojado depende del control de acceso de Sites. Este código exportado puede ejecutarse localmente, pero no incluye un sistema propio de autenticación: cualquier alojamiento externo debe configurar su acceso antes de desplegarlo.
