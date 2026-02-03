---
description: Revisar y aplicar skills y patrones del proyecto
---

# /review-skills

Workflow para revisar todas las skills disponibles y aplicar los patrones documentados.

## Pasos

### 1. Listar skills disponibles
// turbo
```bash
find .agent/skills -name "SKILL.md" -type f
```

### 2. Leer cada skill relevante
Para cada skill encontrada:
- Usar `view_file` en el archivo SKILL.md
- Identificar patrones aplicables a la tarea actual

### 3. Skills actuales del proyecto

| Skill | Descripción | Cuándo usar |
|-------|-------------|-------------|
| `shadcn-react` | Patrones shadcn/ui + React Hook Form | Formularios, Select, validación |
| `equinox-ui` | Patrones específicos de Equinox | CRUD, RIF, Tauri commands |

### 4. Actualizar skills si es necesario
Si durante el trabajo encuentras nuevos patrones o soluciones:
1. Identificar la skill apropiada (o crear una nueva)
2. Agregar documentación del patrón con ejemplo de código
3. Incluir el problema que resuelve y la solución

### 5. Crear nueva skill (si aplica)
```bash
mkdir -p .agent/skills/{nombre-skill}
```

Estructura del SKILL.md:
```markdown
---
name: nombre-skill
description: Descripción breve del skill
---

# Título del Skill

## Problema
Descripción del problema que resuelve.

## Solución
Código y explicación de la solución.

## Ejemplos
Ejemplos de uso en el proyecto.
```
