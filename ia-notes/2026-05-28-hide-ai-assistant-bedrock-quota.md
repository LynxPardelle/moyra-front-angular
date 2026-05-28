# Ocultar asistente IA por cuota Bedrock

Fecha: 2026-05-28 CT

## Decision

El panel operativo del asistente IA queda oculto temporalmente en el frontend. No se borra el codigo ni el diseno porque la intencion sigue siendo retomarlo cuando AWS Bedrock permita invocar los modelos de forma estable.

## Motivo

El 2026-05-27 CT se probaron invocaciones directas en `us-east-1` contra los modelos configurados para Moyra:

- `ai21.jamba-1-5-mini-v1:0`
- `amazon.nova-micro-v1:0`
- `amazon.nova-lite-v1:0`
- `amazon.nova-pro-v1:0`

Los cuatro respondieron con `ThrottlingException` y el mensaje `Too many tokens per day, please wait before trying again.`. La revision de Service Quotas mostro cuotas regionales y limites diarios de tokens en `0` para Nova y Jamba en este account.

## Alcance del cambio

- Ocultar `<app-ai-assistant-panel>` desde el componente compartido.
- Evitar llamadas a `/api/v2/ai/models`, `/api/v2/ai/usage` y `/api/v2/ai/assist` desde el panel mientras la bandera este apagada.
- Mantener `/admin/uso` visible para costos, historico de intentos fallidos y monitoreo futuro.

## Como reactivarlo

Cuando AWS habilite cuota diaria usable:

1. Repetir prueba directa contra Bedrock con prompts de bajo costo.
2. Confirmar que al menos un modelo responde `200`.
3. Cambiar `AI_ASSISTANT_FEATURE_ENABLED` a `true` en `src/app/components/web-utility/ai-assistant-panel/ai-assistant-panel.component.ts`.
4. Revalidar Blog, Publicaciones, Soluciones y Configuraciones.
5. Mantener la busqueda web oculta hasta tener proveedor y medicion de costo separada.
