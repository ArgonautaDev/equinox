---
description: Gestionar y aplicar agentes especializados del proyecto
---

# /agents

Workflow para invocar y gestionar los distintos agentes especializados del proyecto.

## Agentes disponibles

### Agente de Revisión
**Propósito**: Revisar código, detectar problemas, sugerir mejoras.

**Invocar cuando**:
- Se completa una feature
- Antes de un commit importante
- Para auditar un módulo

**Acciones**:
1. Revisar estructura del código
2. Verificar patrones de skills aplicados
3. Detectar código muerto o warnings
4. Sugerir optimizaciones

### Agente de Redacción
**Propósito**: Crear documentación, comentarios, README.

**Invocar cuando**:
- Se crea un nuevo módulo
- Se necesita documentar una API
- Para generar comentarios de código

**Acciones**:
1. Generar documentación markdown
2. Crear/actualizar README
3. Documentar funciones y structs
4. Crear ejemplos de uso

### Agente de Lectura
**Propósito**: Entender código existente, analizar dependencias.

**Invocar cuando**:
- Se entra a un proyecto nuevo
- Se necesita entender un módulo
- Para mapear dependencias

**Acciones**:
1. Analizar estructura del proyecto
2. Mapear relaciones entre módulos
3. Identificar patrones usados
4. Generar resumen ejecutivo

### Agente de Edición
**Propósito**: Modificar código siguiendo patrones establecidos.

**Invocar cuando**:
- Se implementa una feature
- Se corrige un bug
- Se refactoriza código

**Acciones**:
1. Consultar skills relevantes primero
2. Aplicar patrones documentados
3. Mantener consistencia con código existente
4. Actualizar skills si se descubren nuevos patrones

## Flujo de trabajo recomendado

```
1. /agents lectura  → Entender contexto
2. /review-skills   → Revisar patrones disponibles
3. /agents edición  → Implementar cambios
4. /agents revisión → Verificar calidad
5. /review-skills   → Actualizar skills si aplica
```

## Invocación

Para invocar un agente específico, usa:
- `/agents revision` - Revisar código
- `/agents redaccion` - Crear documentación
- `/agents lectura` - Analizar código
- `/agents edicion` - Modificar código
