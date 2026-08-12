# CosteoKit — Auditoría técnica de fuentes

**Generado:** 2026-05-25 19:13

## 1. Fuentes auditadas

- `data/costeokit ejemplo.xlsx` — 30 hojas
- `data/Costeokit Herramienta en blanco.xlsx` — 30 hojas
- `data/Guía calculadora de costos.pdf` — 23 páginas

## 2. Lectura arquitectónica

La app debe tratar estos archivos como **fuentes de conocimiento de negocio**, no como una especificación técnica perfecta.
El Excel trae estructura, nombres, fórmulas y ejemplos; el PDF trae el porqué operativo: food cost, merma, margen, punto de equilibrio, inventario y errores comunes.
La implementación correcta es separar el dominio en entidades y servicios testeables, y usar el importador sólo como puente inicial de datos.

## 3. Inventario de hojas Excel

### `data/costeokit ejemplo.xlsx`

| Hoja | Rango usado | Celdas pobladas | Fórmulas | Lectura funcional probable |
|---|---:|---:|---:|---|
| Instrucciones | B1:B54 | 46 | 0 | Ayuda / onboarding |
| Configuracion | A1:E17 | 21 | 0 | Parámetros globales del negocio |
| Base de Datos | A1:J38 | 283 | 0 | Catálogo de insumos y proveedores |
| Inventario | A2:H38 | 224 | 151 | Conteo físico / stock |
| Pedidos | A1:I54 | 136 | 122 | Pedido sugerido |
| Ingresos y Gastos | A2:H44 | 187 | 68 | Ledger mensual |
| Punto de Equilibrio | A1:H23 | 69 | 31 | Reporte financiero |
| Analisis de Precios | A1:I31 | 176 | 122 | Reporte de pricing |
| Indice de Recetas | B1:I27 | 177 | 103 | Resumen derivado de recetas |
| Sub-recetas | A1:F442 | 752 | 135 | Preparaciones reutilizables |
| Receta 01 | A1:F52 | 96 | 17 | Ficha de receta individual |
| Receta 02 | A1:F52 | 93 | 17 | Ficha de receta individual |
| Receta 03 | A1:F52 | 96 | 17 | Ficha de receta individual |
| Receta 04 | A1:F52 | 93 | 17 | Ficha de receta individual |
| Receta 05 | A1:F52 | 93 | 17 | Ficha de receta individual |
| Receta 06 | A1:F52 | 96 | 17 | Ficha de receta individual |
| Receta 07 | A1:F52 | 93 | 17 | Ficha de receta individual |
| Receta 08 | A1:F52 | 93 | 17 | Ficha de receta individual |
| Receta 09 | A1:F52 | 90 | 17 | Ficha de receta individual |
| Receta 10 | A1:F52 | 93 | 17 | Ficha de receta individual |
| Receta 11 | A1:F52 | 90 | 17 | Ficha de receta individual |
| Receta 12 | A1:F52 | 93 | 17 | Ficha de receta individual |
| Receta 13 | A1:F52 | 90 | 17 | Ficha de receta individual |
| Receta 14 | A1:F52 | 93 | 17 | Ficha de receta individual |
| Receta 15 | A1:F52 | 84 | 17 | Ficha de receta individual |
| Receta 16 | A1:F52 | 87 | 17 | Ficha de receta individual |
| Receta 17 | A1:F52 | 96 | 17 | Ficha de receta individual |
| Receta 18 | A1:F52 | 96 | 17 | Ficha de receta individual |
| Receta 19 | A1:F52 | 96 | 17 | Ficha de receta individual |
| Receta 20 | A1:F52 | 90 | 17 | Ficha de receta individual |

### `data/Costeokit Herramienta en blanco.xlsx`

| Hoja | Rango usado | Celdas pobladas | Fórmulas | Lectura funcional probable |
|---|---:|---:|---:|---|
| Instrucciones | B1:B54 | 46 | 0 | Ayuda / onboarding |
| Configuracion | A1:E17 | 17 | 0 | Parámetros globales del negocio |
| Base de Datos | A1:J8 | 13 | 0 | Catálogo de insumos y proveedores |
| Inventario | A2:H38 | 163 | 151 | Conteo físico / stock |
| Pedidos | A1:I54 | 136 | 122 | Pedido sugerido |
| Ingresos y Gastos | A2:H44 | 85 | 61 | Ledger mensual |
| Punto de Equilibrio | A1:H23 | 39 | 16 | Reporte financiero |
| Analisis de Precios | A1:I31 | 116 | 102 | Reporte de pricing |
| Indice de Recetas | B1:I27 | 57 | 43 | Resumen derivado de recetas |
| Sub-recetas | A1:F442 | 611 | 135 | Preparaciones reutilizables |
| Receta 01 | A1:F52 | 64 | 17 | Ficha de receta individual |
| Receta 02 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 03 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 04 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 05 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 06 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 07 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 08 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 09 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 10 | A1:F52 | 66 | 16 | Ficha de receta individual |
| Receta 11 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 12 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 13 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 14 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 15 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 16 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 17 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 18 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 19 | A1:F52 | 63 | 16 | Ficha de receta individual |
| Receta 20 | A1:F52 | 63 | 16 | Ficha de receta individual |

## 4. Mapeo hoja → módulo de app

| Hoja | Entidades/módulo | Implementación |
|---|---|---|
| Configuracion | `business_settings` | Configuración del negocio: moneda, impuestos, margen objetivo, food cost máximo. |
| Base de Datos | `suppliers, ingredients` | Catálogo de insumos, proveedores, unidades, precios, consumos y mermas/factores. |
| Inventario | `inventory_counts, inventory_count_lines` | Conteos físicos y stock actual por insumo. |
| Pedidos | `purchase_suggestions, purchase_suggestion_lines` | Pedido sugerido por consumo máximo, stock y proveedor. |
| Ingresos y Gastos | `monthly_ledgers, monthly_ledger_lines` | Registro mensual/semanal de ventas y costos. |
| Punto de Equilibrio | `break_even service/report` | Cálculo de ventas/unidades necesarias para no perder plata. |
| Analisis de Precios | `pricing read model/report` | Comparación de costo, precio, food cost y margen. |
| Indice de Recetas | `recipes summary/read model` | Listado de recetas con costos/estado; NO fuente de verdad de costos. |
| Sub-recetas | `sub_recipes, sub_recipe_lines` | Preparaciones reutilizables con costo por unidad de salida. |
| Receta 01..20 | `recipes, recipe_lines` | Recetas individuales: líneas de insumos/sub-recetas, rendimiento, precio sugerido. |
| Instrucciones | `onboarding/help` | Material de ayuda; útil para microcopy y validaciones, no para cálculo. |

## 5. Reglas de negocio extraídas del PDF

- **Food cost:** No es ganancia; mide la proporción del precio que se consume en materia prima. Debe calcularse contra precio sin impuesto cuando corresponda.
- **Merma/factor de corrección:** Debe modelarse explícitamente porque afecta el costo real comprable/usable. No mezclarlo con consumo diario.
- **Margen de contribución:** No confundir margen bruto con plata disponible final; sirve para entender cuánto aporta cada venta a cubrir estructura.
- **Punto de equilibrio:** Debe responder cuántas unidades y ventas hacen falta por mes/día para no perder plata.
- **Costo teórico vs real:** El sistema debe permitir comparar cálculo estándar contra realidad operativa; las diferencias no son bug, son señal de gestión.
- **Estandarización:** Sin recetas fijas no hay costeo confiable. El editor de recetas debe empujar cantidades, unidades y rendimientos claros.
- **Sub-recetas:** Deben ser preparaciones reutilizables con rendimiento propio y costo por unidad de salida, no líneas mágicas.
- **Inventario y pedidos:** El pedido sugerido debe derivarse de stock, consumo y punto de reposición, manteniendo trazabilidad del motivo.
- **Errores comunes:** La app debe prevenir precios cargados a ojo, unidades inconsistentes, mermas omitidas y cálculos cacheados sin trazabilidad.

## 6. Hallazgos técnicos del Excel

- Ambos Excel tienen las mismas 30 hojas esperadas: configuración, base de datos, inventario, pedidos, finanzas, equilibrio, pricing, índice, sub-recetas y 20 recetas.
- Hay que diferenciar el Excel de ejemplo del Excel en blanco: el primero sirve para entender datos y resultados esperados; el segundo para detectar estructura y defaults.
- Los costos visibles en hojas agregadas como `Indice de Recetas` o `Analisis de Precios` deben tratarse como reportes derivados, no como fuente primaria.
- Las recetas deben recalcularse desde `ingredients`, `sub_recipes` y `recipe_lines`; no desde valores cacheados del workbook.
- Las unidades y conversiones deben ser explícitas. Si una receta usa gramos y el insumo se compra por kg, el motor debe convertir; no esconderlo en fórmulas sueltas.
- Consumo diario, merma y factor de corrección deben ser campos distintos. Si el Excel mezcla conceptos, la app debe corregir el modelo.

## 7. Motor de cálculo mínimo

- `convertUnit(value, fromUnit, toUnit)`
- `calculateIngredientUnitCost(ingredient)`
- `calculateRecipeLineCost(line, context)`
- `calculateSubRecipeCost(subRecipe, context)`
- `calculateRecipeCost(recipe, context)`
- `calculateSuggestedPrice(cost, targetMarginPct, taxPct)`
- `calculateFoodCostPct(cost, priceWithoutTax)`
- `calculateGrossMarginPct(cost, priceWithoutTax)`
- `calculateInventoryReorderPoint(maxDailyConsumption)`
- `calculatePurchaseSuggestion(inventoryLine, ingredient)`
- `calculateBreakEven(input)`

## 8. Tests obligatorios antes de UI pesada

- Conversión kg ↔ gramo, L ↔ ml, docena ↔ unidad.
- Costo unitario de insumo con precio de compra, cantidad, unidad de compra, unidad de uso y merma.
- Costo de línea de receta usando insumo directo.
- Costo de sub-receta y costo por unidad de salida usable.
- Costo total y unitario de receta según porciones/rendimiento.
- Precio sugerido con margen objetivo e IVA.
- Food cost y margen bruto.
- Semáforo de pricing: OK / ADJUST / REVIEW.
- Punto de pedido: `maxDailyConsumption * 3`.
- Punto de equilibrio mensual/diario.
- Importador: detecta 30 hojas, estructura esperada y reporta inconsistencias sin confiar en cacheados.

## 9. Estrategia de importación

1. Leer workbook y validar presencia de hojas esperadas.
2. Parsear configuración e insumos primero.
3. Parsear sub-recetas antes de recetas, porque pueden ser dependencia de recetas.
4. Parsear recetas 01..20 como entidades normalizadas, no como hojas permanentes.
5. Recalcular costos con `CostingEngine` propio.
6. Comparar resultados recalculados contra valores visibles del Excel sólo como diagnóstico.
7. Generar `excel_imports.report_json` con warnings, errores y decisiones de mapeo.
8. Confirmar importación; desde ese punto la app es fuente de verdad.

## 10. Próximo paso recomendado

Antes de construir CRUD completo, implementar una primera vertical chica:

1. `CostingEngine` puro + tests.
2. Schema Drizzle para `business_settings`, `suppliers`, `ingredients`, `recipes`, `recipe_lines`, `sub_recipes`, `sub_recipe_lines`.
3. Importador read-only que produzca reporte, sin escribir DB todavía.
4. Pantalla mínima de insumos/receta sólo para validar que el motor cierra.

Esto evita el error clásico: UI preciosa con fundamentos financieros flojos. En costos gastronómicos, si el número está mal, TODO está mal.

## Apéndice A — Fórmulas de muestra relevantes

- `data/costeokit ejemplo.xlsx` / `Inventario` / `B9`: `='Base de Datos'!B9`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `C9`: `='Base de Datos'!C9`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `D9`: `='Base de Datos'!G9`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `G9`: `=IF('Base de Datos'!J9>0,'Base de Datos'!J9*3,"")`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `B10`: `='Base de Datos'!B10`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `C10`: `='Base de Datos'!C10`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `D10`: `='Base de Datos'!G10`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `G10`: `=IF('Base de Datos'!J10>0,'Base de Datos'!J10*3,"")`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `B11`: `='Base de Datos'!B11`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `C11`: `='Base de Datos'!C11`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `D11`: `='Base de Datos'!G11`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `G11`: `=IF('Base de Datos'!J11>0,'Base de Datos'!J11*3,"")`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `B12`: `='Base de Datos'!B12`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `C12`: `='Base de Datos'!C12`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `D12`: `='Base de Datos'!G12`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `G12`: `=IF('Base de Datos'!J12>0,'Base de Datos'!J12*3,"")`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `B13`: `='Base de Datos'!B13`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `C13`: `='Base de Datos'!C13`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `D13`: `='Base de Datos'!G13`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `G13`: `=IF('Base de Datos'!J13>0,'Base de Datos'!J13*3,"")`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `B14`: `='Base de Datos'!B14`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `C14`: `='Base de Datos'!C14`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `D14`: `='Base de Datos'!G14`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `G14`: `=IF('Base de Datos'!J14>0,'Base de Datos'!J14*3,"")`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `B15`: `='Base de Datos'!B15`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `C15`: `='Base de Datos'!C15`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `D15`: `='Base de Datos'!G15`
- `data/costeokit ejemplo.xlsx` / `Inventario` / `G15`: `=IF('Base de Datos'!J15>0,'Base de Datos'!J15*3,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `B8`: `=IF(Inventario!E9<=Inventario!G9,'Base de Datos'!B9,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `C8`: `=IF(Inventario!E9<=Inventario!G9,'Base de Datos'!D9,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `F8`: `=IFERROR(IF(Inventario!E9<=Inventario!G9,MAX(CEILING(('Base de Datos'!J9*3-Inventario!E9)/'Base de Datos'!F9,1),1),""),"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `G8`: `=IF(Inventario!E9<=Inventario!G9,'Base de Datos'!E9,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `H8`: `=IF(Inventario!E9<=Inventario!G9,'Base de Datos'!H9,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `I8`: `=IF(AND(F8<>"",H8<>""),F8*H8*'Base de Datos'!F9,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `B9`: `=IF(Inventario!E11<=Inventario!G11,'Base de Datos'!B11,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `C9`: `=IF(Inventario!E11<=Inventario!G11,'Base de Datos'!D11,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `F9`: `=IFERROR(IF(Inventario!E11<=Inventario!G11,MAX(CEILING(('Base de Datos'!J11*3-Inventario!E11)/'Base de Datos'!F11,1),1),""),"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `G9`: `=IF(Inventario!E11<=Inventario!G11,'Base de Datos'!E11,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `H9`: `=IF(Inventario!E11<=Inventario!G11,'Base de Datos'!H11,"")`
- `data/costeokit ejemplo.xlsx` / `Pedidos` / `I9`: `=IF(AND(F9<>"",H9<>""),F9*H9*'Base de Datos'!F11,"")`
