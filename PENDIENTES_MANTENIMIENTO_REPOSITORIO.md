# Pendientes de mantenimiento del repositorio

Actualizado: 2026-08-12 (America/Mexico_City)

## Estado preservado

- El worktree `Z:\GitHub\moyra-front-angular` conserva la rama histórica
  `codex/moyra-production-scroll-fix`. Antes de esta revisión estaba 91 commits detrás de
  `origin/production`; sus nueve cambios rastreados de SSR, scroll e inserciones seguras ya habían
  llegado a producción por otra ruta mediante el commit `c48828a`.
- Esa rama histórica, junto con su plan y herramienta nuevos, fue respaldada sin rebase ni mezcla en
  `origin/codex/moyra-production-scroll-fix` (`059b66a`). No debe promoverse íntegra a producción:
  contiene una instantánea anterior y duplicaría comportamiento ya integrado.
- `Output/` es evidencia local y privada. Está excluido en la raíz mediante `/Output/`, pero sus
  archivos se conservan en disco. Nunca debe publicarse ni incluirse en un commit.

## Artefactos externos retenidos

Los siguientes ZIP permanecen exclusivamente en
`Z:\GitHub\moyra-front-angular-qa\Output\rollback`:

| Archivo | SHA-256 | Uso | Prioridad | Manejo |
| --- | --- | --- | --- | --- |
| `moyra-production-frontend-ssr-before-d1dc2335c0ea.zip` | `ecf277e9c56ff84191fd4a0eb1c4b1835cc80043e59df989bfb2df5ae98b41f7` | Reversión SSR de producción | Alta | Alta: copiar cifrado y verificar hash |
| `moyra-test-frontend-ssr-before-67c2674bcbbc.zip` | `ecf277e9c56ff84191fd4a0eb1c4b1835cc80043e59df989bfb2df5ae98b41f7` | Reversión SSR de test | Alta | Alta: copiar cifrado y verificar hash |
| `moyra-test-frontend-ssr-before-dbf7b856d3c4.zip` | `3bb01831eadad308e79a054caa455eec2a404d133313989b7fd9ffcde1718422` | Reversión SSR posterior de test | Alta | Alta: copiar cifrado y verificar hash |

Los dos primeros ZIP son idénticos byte por byte pese a tener nombres de ambiente y commit
distintos. Trátese como inconsistencia de etiquetado: no asumir que el nombre demuestra el ambiente.
El tercer ZIP es diferente. No borrar, renombrar, mover ni subir estos artefactos sin validar primero
su destino y el hash.

## Pendientes no bloqueantes

- `npm audit --omit=dev` queda en cero después de actualizar Angular 21 a los parches compatibles.
- El audit completo conserva cinco hallazgos del toolchain (cuatro moderados y uno alto); las
  correcciones sugeridas por npm requieren Angular 22 o una regresión de Angular CLI. Evaluar una
  migración coordinada cuando NgRx y el resto de dependencias estén validados para Angular 22.
- El build actual de producción ya emite cuatro advertencias de presupuesto: el bundle inicial y
  estilos de tres componentes de Casos. No bloquean compilación ni empaquetado, pero conviene
  reducirlos en una tarea dedicada sin mezclar cambios de diseño.
