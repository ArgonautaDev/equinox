---
description: Workflow maestro para gestión de skills y agentes
---

# /master

Workflow maestro que combina skills y agentes para trabajo eficiente.

## Inicio rápido

### Antes de cualquier tarea compleja:
1. Leer skills relevantes
2. Entender el contexto del código
3. Aplicar patrones documentados

### Comandos disponibles:

| Comando | Descripción |
|---------|-------------|
| `/review-skills` | Revisar y actualizar skills |
| `/agents` | Ver agentes disponibles |
| `/agents revision` | Revisar código |
| `/agents redaccion` | Documentar |
| `/agents lectura` | Analizar código |
| `/agents edicion` | Implementar cambios |

## Estructura del proyecto .agent

```
.agent/
├── skills/                    # Patrones reutilizables
│   ├── shadcn-react/         # shadcn/ui + React Hook Form
│   │   └── SKILL.md
│   └── equinox-ui/           # Patrones Equinox ERP
│       └── SKILL.md
└── workflows/                 # Flujos de trabajo
    ├── review-skills.md      # Gestión de skills
    ├── agents.md             # Agentes especializados
    └── master.md             # Este archivo
```

## Cuándo crear nuevos skills

1. **Patrón repetido**: Si usas el mismo código/solución 3+ veces
2. **Bug resuelto**: Cuando encuentras un fix no obvio
3. **Integración compleja**: Cuando combinas múltiples bibliotecas
4. **Convención del proyecto**: Patrones específicos de Equinox

## Cuándo actualizar skills existentes

1. **Nueva solución**: Encontraste una mejor manera
2. **Caso edge**: El skill no cubría un caso específico
3. **Deprecación**: La biblioteca cambió su API
4. **Clarificación**: El skill era confuso o incompleto
