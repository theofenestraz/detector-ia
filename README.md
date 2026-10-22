# Huella

Detector de texto generado por IA que funciona entero en el navegador. Pegas un texto y te dice qué porcentaje suena a IA, marca cada frase en amarillo según lo sospechosa que sea y explica por qué (frases hechas, palabras comodín, rayas, enumeraciones de tres, longitud de frase demasiado regular, etc.). No reescribe nada: sirve para encontrar las frases que conviene revisar.

No usa ningún modelo ni servidor. El análisis está en `detector.js` y son reglas heurísticas para español e inglés, así que el resultado es orientativo.

Para probarlo en local:

```bash
python3 -m http.server 8765
```
