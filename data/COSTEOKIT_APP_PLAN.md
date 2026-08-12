# CosteoKit App — Contexto y Plan de Implementación

**Fecha:** 2026-05-25  
**Proyecto origen:** `/Users/juancruzlescano/Documents/New project`  
**Documento base:** `/Users/juancruzlescano/Documents/New project/COSTEOKIT_ANALISIS.md`  
**Excel auditado:** `/Users/juancruzlescano/Benny Burgers/controla-tus-costos-fija-precios-estrategicos-y-aumenta-tus-ganancias_default-title_5164cb84d3ed6019/costeokit ejemplo.xlsx`

---

## 1. Contexto general

Queremos crear una app que reemplace al **100%** el Excel CosteoKit, pero con una aclaración fundamental:

> La app debe reemplazar la **intención de negocio** del Excel, no copiar ciegamente sus errores internos.

El Excel actual es un sistema bastante completo para una operación gastronómica. Contiene:

- configuración del negocio;
- base de insumos;
- proveedores;
- inventario;
- pedido sugerido;
- ingresos y gastos;
- punto de equilibrio;
- recetas;
- sub-recetas;
- análisis de precios;
- food cost;
- margen bruto;
- alertas por recetas desactualizadas.

La app debe convertir esa lógica en un sistema mantenible, claro y escalable.

---

## 2. Estado actual del proyecto

**Verificado:** la carpeta actual:

`/Users/juancruzlescano/Documents/New project`

contiene solamente:

- `.git/`
- `COSTEOKIT_ANALISIS.md`
- este documento `COSTEOKIT_APP_PLAN.md`

No hay app implementada todavía en esta carpeta.

También se detectaron proyectos Next/shadcn candidatos para migrar el contexto, especialmente:

`/Users/juancruzlescano/Developer/benny/benny-cost-manager`

Ese parece ser el destino natural para implementar la app, pero debe confirmarse antes de copiar o modificar archivos ahí.

---

## 3. Decisiones de producto

### 3.1 Objetivo

Crear una **app completa** para reemplazar el Excel CosteoKit.

No será un clon visual de hojas. Será una aplicación de dominio gastronómico basada en los aprendizajes del Excel.

### 3.2 Primer usuario objetivo

**Benny primero.**

La app se optimiza inicialmente para resolver una operación real, no para construir un SaaS genérico desde el primer día.

Después de validar con Benny, se podrá generalizar para otros negocios gastronómicos.

### 3.3 Tipo de interfaz

**Desktop-like web app.**

La experiencia principal será tipo panel administrativo, cómoda para carga intensiva y análisis:

- tablas;
- formularios;
- dashboards;
- vistas maestras/detalle;
- importación de Excel;
- reportes de costos y márgenes.

No se prioriza mobile-first en v1, aunque la app puede ser responsive.

### 3.4 Modelo de usuarios

**Usuario único en v1.**

No se implementa multiusuario ni multi-tenant de entrada.

Esto reduce complejidad inicial. Más adelante se puede evolucionar a:

- roles;
- equipo;
- múltiples locales;
- múltiples negocios;
- SaaS.

---

## 4. Decisiones técnicas

### 4.1 Stack recomendado para v1

- **Next.js**
- **TypeScript**
- **SQLite**
- **Drizzle ORM**
- **shadcn/ui**

### 4.2 Base de datos

La decisión inicial había sido Postgres, pero fue revisada.

Para v1, la recomendación actual es:

> **SQLite + Drizzle ORM**, con schema diseñado para poder migrar a Postgres más adelante.

### 4.3 Por qué SQLite y no Postgres todavía

SQLite alcanza para el escenario actual porque:

- la primera versión es para Benny;
- el modelo será de usuario único;
- no hay concurrencia pesada al inicio;
- simplifica desarrollo y deploy;
- permite backups simples como archivo;
- evita levantar infraestructura innecesaria.

Postgres en Docker sería razonable cuando aparezcan necesidades como:

- multiusuario real;
- varias sucursales;
- SaaS;
- concurrencia más alta;
- auditoría avanzada;
- reporting pesado;
- integraciones externas.

**Conclusión:** no meter Postgres por ansiedad. Primero solidificar el dominio.

### 4.4 Regla de migrabilidad futura

Aunque v1 use SQLite, no hay que escribir código acoplado a SQLite.

Reglas:

- usar Drizzle para schema y queries;
- evitar SQL específico innecesario;
- guardar dinero de forma segura, no con floats sueltos;
- aislar cálculos en servicios de dominio, no en queries;
- mantener migraciones limpias;
- pensar tablas compatibles con Postgres.

---

## 5. Decisión de UI: 100% shadcn/ui

El usuario pidió explícitamente:

> Usar 100% shadcn sin modificar componentes.

Regla de implementación:

- usar componentes instalados vía CLI de shadcn;
- no modificar componentes base/upstream en `components/ui`;
- componer pantallas con shadcn;
- usar variantes existentes;
- no inventar componentes visuales custom si shadcn ya resuelve el caso;
- usar tokens semánticos, no colores hardcodeados;
- mantener accesibilidad y composición correcta.

Componentes esperados:

- `Sidebar`
- `Card`
- `Table`
- `Tabs`
- `Dialog`
- `Sheet`
- `Form`
- `Field`
- `Input`
- `Select`
- `Badge`
- `Alert`
- `Empty`
- `Separator`
- `Skeleton`
- `Sonner`
- `Chart` cuando haga falta visualización.

Principio:

> Componer, no reinventar.

Esto evita deuda visual y mantiene consistencia.

---

## 6. Decisión sobre Excel

### 6.1 Importador inicial

La app debe tener un **importador inicial** desde el Excel.

Objetivo:

- leer datos existentes;
- migrar configuración;
- migrar insumos;
- migrar recetas;
- migrar sub-recetas;
- detectar inconsistencias;
- generar un reporte de importación.

### 6.2 No sync permanente

No se hará sincronización bidireccional permanente con Excel.

Después de importar:

> La app pasa a ser la fuente de verdad.

Mantener sync con Excel sería muy propenso a inconsistencias y mucho más caro técnicamente.

---

## 7. Problemas detectados en el Excel que la app debe corregir

Estos problemas están documentados en detalle en `COSTEOKIT_ANALISIS.md`.

### 7.1 Consumo diario mezclado con merma

En el Excel, la columna `Base de Datos!I` está rotulada como `CONSUMO MÍN DIARIO`, pero las fórmulas de recetas/sub-recetas la usan como factor de corrección/merma:

```excel
(1+IF('Base de Datos'!$I$9:$I$68="",0,'Base de Datos'!$I$9:$I$68))
```

La app debe separar explícitamente:

- consumo mínimo diario;
- consumo máximo diario;
- merma;
- factor de corrección.

### 7.2 Falta de conversión explícita de unidades

El Excel permite cargar cantidades en gramos/ml mientras la base puede tener precios por kg/L.

La app debe implementar conversiones explícitas:

- kg ↔ gramo;
- L ↔ ml;
- unidad ↔ unidad;
- docena ↔ unidad;
- presentación ↔ unidad base cuando aplique.

### 7.3 Costos duplicados o estáticos

En el Excel hay valores cargados manualmente en hojas como:

- `Indice de Recetas`;
- `Analisis de Precios`.

Eso puede desconectarse del costo real calculado en las recetas.

La app debe tener una única fuente de verdad para el costo de receta.

### 7.4 Sub-recetas con referencia sospechosa

La tabla de referencia de sub-recetas parece mirar una celda que puede no ser el costo visible correcto.

La app debe modelar `costPerOutputUnit` explícitamente y no depender de coordenadas de Excel.

### 7.5 Valores cacheados no confiables

Los valores cacheados del Excel no deben ser fuente final de verdad.

La app debe recalcular desde su modelo propio.

---

## 8. Modelo de dominio propuesto

### 8.1 Configuración del negocio

```text
business_settings
- id
- business_name
- business_type
- currency_symbol
- target_margin_pct
- max_food_cost_pct
- tax_pct
- created_at
- updated_at
```

### 8.2 Proveedores

```text
suppliers
- id
- name
- notes
- created_at
- updated_at
```

### 8.3 Insumos

```text
ingredients
- id
- name
- category
- supplier_id
- purchase_presentation_label
- purchase_quantity
- purchase_unit
- usage_unit
- purchase_price
- waste_pct
- min_daily_consumption
- max_daily_consumption
- active
- created_at
- updated_at
```

### 8.4 Recetas

```text
recipes
- id
- name
- category
- servings
- production_waste_pct
- target_margin_pct
- current_sale_price
- last_costing_at
- created_at
- updated_at
```

```text
recipe_lines
- id
- recipe_id
- ingredient_id
- sub_recipe_id
- quantity
- unit
- sort_order
```

### 8.5 Sub-recetas

```text
sub_recipes
- id
- name
- raw_weight
- final_usable_weight
- output_unit
- error_pct
- created_at
- updated_at
```

```text
sub_recipe_lines
- id
- sub_recipe_id
- ingredient_id
- quantity
- unit
- sort_order
```

### 8.6 Inventario

```text
inventory_counts
- id
- counted_at
- counted_by
- notes
```

```text
inventory_count_lines
- id
- inventory_count_id
- ingredient_id
- current_quantity
- unit
- location
```

### 8.7 Pedido sugerido

```text
purchase_suggestions
- id
- generated_at
- status
- notes
```

```text
purchase_suggestion_lines
- id
- purchase_suggestion_id
- ingredient_id
- supplier_id
- current_quantity
- reorder_point
- suggested_packages
- estimated_cost
- reason
```

### 8.8 Ingresos y gastos

```text
monthly_ledgers
- id
- month
- year
- created_at
- updated_at
```

```text
monthly_ledger_lines
- id
- monthly_ledger_id
- type
- concept
- week_1_amount
- week_2_amount
- week_3_amount
- week_4_amount
- total_amount
```

### 8.9 Importaciones Excel

```text
excel_imports
- id
- source_filename
- imported_at
- status
- report_json
```

---

## 9. Motor de cálculo

La app debe tener un `CostingEngine` aislado de la UI y de la base de datos.

Esto es clave: los cálculos son el corazón del producto. No van mezclados en componentes React.

### 9.1 Funciones mínimas

```text
CostingEngine
- convertUnit(value, fromUnit, toUnit)
- calculateIngredientUnitCost(ingredient)
- calculateRecipeLineCost(line)
- calculateSubRecipeCost(subRecipe)
- calculateRecipeCost(recipe)
- calculateSuggestedPrice(cost, targetMargin, taxPct)
- calculateFoodCostPct(cost, priceWithoutTax)
- calculateGrossMarginPct(cost, priceWithoutTax)
- calculateInventoryReorderPoint(maxDailyConsumption)
- calculatePurchaseSuggestion(inventory, ingredient)
- calculateBreakEven(input)
```

### 9.2 Política de cálculo

La app debe:

- preservar la intención de negocio del Excel;
- corregir errores de modelado;
- convertir unidades explícitamente;
- separar consumo de merma;
- recalcular estados con fecha real;
- evitar costos duplicados;
- permitir trazabilidad de cómo se obtuvo cada número.

---

## 10. Módulos funcionales de la app

### 10.1 Dashboard

Debe mostrar:

- recetas a revisar;
- food cost promedio;
- productos con margen bajo;
- insumos a reponer;
- valor estimado de pedido;
- resumen de punto de equilibrio.

### 10.2 Configuración

- tipo de negocio;
- moneda;
- IVA;
- margen objetivo;
- food cost máximo.

### 10.3 Insumos

- listado;
- alta/edición;
- proveedor;
- precio;
- unidad de compra;
- unidad de uso;
- merma;
- consumo mínimo/máximo diario.

### 10.4 Recetas

- listado;
- editor de receta;
- líneas de insumos o sub-recetas;
- costo calculado;
- precio sugerido;
- margen;
- estado de revisión.

### 10.5 Sub-recetas

- reutilizables dentro de recetas;
- costo por unidad de output;
- peso crudo;
- peso utilizable;
- merma/error.

### 10.6 Precios

- tabla de análisis;
- food cost;
- margen bruto;
- precio sin IVA;
- precio con IVA;
- semáforo.

### 10.7 Inventario

- conteo físico;
- ubicación;
- punto de pedido;
- alerta de reposición.

### 10.8 Pedido sugerido

- lista de insumos a comprar;
- proveedor;
- cantidad sugerida;
- costo estimado;
- motivo de reposición.

### 10.9 Ingresos y gastos

- registro mensual;
- semanas 1 a 4;
- ingresos;
- gastos fijos;
- gastos variables;
- materia prima.

### 10.10 Punto de equilibrio

- ticket promedio;
- margen de contribución;
- unidades necesarias por mes;
- ventas necesarias por mes;
- unidades necesarias por día;
- ventas necesarias por día.

### 10.11 Importador Excel

- subir archivo;
- leer workbook;
- mapear datos;
- reportar inconsistencias;
- permitir revisar antes de confirmar importación.

---

## 11. Fórmulas centrales a preservar/corregir

### 11.1 Precio sugerido

```text
adjustedCost = ingredientCost + wasteCost + extraCost
unitCost = adjustedCost / servings
suggestedPriceWithoutTax = unitCost / (1 - targetMarginPct)
suggestedPriceWithTax = suggestedPriceWithoutTax * (1 + taxPct)
```

### 11.2 Food cost

```text
foodCostPct = unitCost / priceWithoutTax
```

### 11.3 Margen bruto

```text
grossMarginPct = (priceWithoutTax - unitCost) / priceWithoutTax
grossProfitAmount = priceWithoutTax - unitCost
```

### 11.4 Semáforo de precio

```text
if grossMarginPct >= targetMarginPct:
  status = OK
else if grossMarginPct >= targetMarginPct - 0.10:
  status = ADJUST
else:
  status = REVIEW
```

### 11.5 Revisión de recetas

```text
if lastCostingAt is null:
  status = WITHOUT_DATE
else if today - lastCostingAt > 90 days:
  status = REVIEW
else:
  status = OK
```

### 11.6 Inventario

```text
reorderPoint = maxDailyConsumption * 3
needsRestock = currentStock <= reorderPoint
```

### 11.7 Punto de equilibrio

```text
avgTicket = monthlyRevenue / monthlySalesCount
contributionMarginAmount = avgTicket * (1 - avgFoodCostPct) - variableCostPerSale
contributionMarginPct = contributionMarginAmount / avgTicket
breakEvenUnitsMonth = ceil(fixedCosts / contributionMarginAmount)
breakEvenRevenueMonth = avgTicket * breakEvenUnitsMonth
breakEvenUnitsDay = ceil(breakEvenUnitsMonth / sellingDays)
breakEvenRevenueDay = avgTicket * breakEvenUnitsDay
```

---

## 12. Plan de implementación sugerido

### Fase 1 — Migrar contexto al proyecto real

1. Confirmar carpeta destino.
2. Candidato actual:
   `/Users/juancruzlescano/Developer/benny/benny-cost-manager`
3. Copiar:
   - `COSTEOKIT_ANALISIS.md`
   - `COSTEOKIT_APP_PLAN.md`
4. Inspeccionar:
   - `package.json`
   - `components.json`
   - estructura App Router;
   - configuración Tailwind;
   - componentes shadcn instalados;
   - si ya existe ORM o DB.

### Fase 2 — Foundation

1. Configurar SQLite + Drizzle.
2. Crear migraciones iniciales.
3. Crear estructura de dominio.
4. Crear layout desktop-like con shadcn.
5. Crear navegación principal.

### Fase 3 — Motor de cálculo

1. Implementar conversiones de unidades.
2. Implementar cálculo de insumo.
3. Implementar cálculo de sub-receta.
4. Implementar cálculo de receta.
5. Implementar precio sugerido.
6. Implementar food cost/margen.
7. Implementar punto de equilibrio.
8. Agregar tests unitarios.

### Fase 4 — CRUD principal

1. Configuración del negocio.
2. Proveedores.
3. Insumos.
4. Recetas.
5. Sub-recetas.

### Fase 5 — Pricing e inventario

1. Índice de recetas.
2. Análisis de precios.
3. Inventario.
4. Pedido sugerido.

### Fase 6 — Finanzas

1. Ingresos y gastos.
2. Punto de equilibrio.
3. Dashboard ejecutivo.

### Fase 7 — Importador Excel

1. Subida de archivo.
2. Parser del workbook.
3. Mapeo a entidades.
4. Reporte de inconsistencias.
5. Confirmación de importación.

---

## 13. Plan de testing

### 13.1 Tests unitarios del motor

- conversión kg ↔ gramo;
- conversión L ↔ ml;
- conversión docena ↔ unidad;
- costo unitario de insumo;
- costo línea de receta;
- costo total de receta;
- costo de sub-receta;
- precio sugerido;
- precio con IVA;
- food cost;
- margen bruto;
- punto de equilibrio;
- punto de pedido;
- pedido sugerido.

### 13.2 Tests de importación

- detecta las 30 hojas esperadas;
- importa configuración;
- importa insumos;
- importa recetas;
- importa sub-recetas;
- reporta columna ambigua de consumo/merma;
- reporta valores duplicados/estáticos;
- no confía en valores cacheados como fuente final.

### 13.3 Tests de aceptación

- cargar insumo;
- crear receta;
- calcular costo;
- obtener precio sugerido;
- ver semáforo de margen;
- registrar inventario;
- generar pedido sugerido;
- cargar gastos;
- calcular punto de equilibrio.

---

## 14. Reglas de trabajo del proyecto

Estas reglas vienen de las instrucciones del usuario/proyecto:

- Nunca agregar `Co-Authored-By` ni atribución de IA en commits.
- Usar conventional commits.
- Nunca correr build después de cambios.
- Si se hace una pregunta, frenar y esperar respuesta.
- No aceptar afirmaciones técnicas sin verificar.
- Si el usuario está equivocado, explicar por qué con evidencia.
- Si el agente se equivoca, reconocerlo con prueba.
- Priorizar conceptos y fundamentos antes que código rápido.
- Para UI, usar 100% shadcn/ui sin modificar componentes base.

---

## 15. Riesgos principales

1. **Copiar el Excel demasiado literal.**  
   Riesgo: arrastrar errores de unidades, merma y valores estáticos.

2. **Construir UI antes del motor de cálculo.**  
   Riesgo: pantallas lindas con números incorrectos.

3. **No testear fórmulas.**  
   Riesgo: perder confianza en el producto.

4. **Acoplarse a SQLite.**  
   Riesgo: migración dolorosa a Postgres después.

5. **Modificar componentes shadcn base.**  
   Riesgo: deuda visual y mantenimiento difícil.

6. **Importar Excel sin reporte de inconsistencias.**  
   Riesgo: meter datos sucios al nuevo sistema.

---

## 16. Próximo paso recomendado

Confirmar carpeta destino y migrar este contexto al proyecto real.

Candidato recomendado:

`/Users/juancruzlescano/Developer/benny/benny-cost-manager`

Después de migrar los documentos, inspeccionar el proyecto real antes de implementar:

- dependencias;
- estructura;
- shadcn instalado;
- Tailwind;
- App Router;
- si ya existe DB/ORM;
- convenciones actuales.

Recién ahí comenzar con Foundation + Motor de cálculo.

---

## 17. Nota arquitectónica final

La app no debería ser “un Excel con login”.

La oportunidad real es convertir una planilla poderosa pero frágil en un sistema confiable para tomar decisiones de negocio:

- cuánto cuesta producir;
- cuánto vender;
- cuándo actualizar recetas;
- cuándo comprar insumos;
- cuánto hay que vender para no perder plata;
- qué productos dejan margen real.

Si el motor de costos está bien, la UI puede evolucionar. Si el motor está mal, no hay shadcn, Postgres ni dashboard que salve el negocio.

CONCEPTOS > CÓDIGO.
