# Aplicación de Seguimiento de Fitness - Implementación de Características

## 1. Gestión de Calendario y Programación

### Vista de Calendario
- Muestra las próximas carreras (próximas 3 carreras programadas)
- Muestra tanto programaciones únicas como semanales recurrentes
- Proporciona interfaz de gestión de programación
- Incluye información de fecha y hora para cada carrera planificada

### Características de Programación
- Funcionalidad de alternancia para programaciones activas/inactivas
- Soporte para patrones semanales recurrentes
- Visualización detallada de información de programación
- Integración con sistema de notificaciones

## 2. Sistema de Seguimiento de Entrenamientos

### Gestión de Salidas Planificadas
- Sistema de almacenamiento y gestión de programaciones
- Integración con seguimiento de salud (React Native Health & Google Fit)
- Seguimiento de estado activo/inactivo
- Sistema de notificaciones para carreras programadas
- Capacidades de monitoreo de progreso

## 3. Implementación de Días de Descanso

### Características Principales
- Planificación específica de días de descanso
- Patrones semanales recurrentes de días de descanso
- Visualización de banner de día de descanso
- Opciones de adición rápida:
  - Hoy
  - Mañana
  - En 2 días

### Integración
- Integración con vista de mapa para prevenir seguimiento en días de descanso
- Sistema de prevención de sobreentrenamiento
- Información y educación sobre días de descanso
- Gestión de patrones semanales

## 4. Implementación de Tasa Metabólica Basal (BMR)

### Cálculo de BMR
```typescript
// Implementación de fórmula BMR
// (10 × peso en kg) + (6.25 × altura en cm) - (5 × edad en años) + 5 (para hombres)
return (10 * weight) + (6.25 * height) - (5 * DEFAULT_AGE) + 5;
```

### Aplicaciones de BMR
- Cálculo de calorías totales quemadas
- Determinación de calorías netas (consumidas - quemadas)
- Línea base para planificación nutricional
- Ajustes según nivel de actividad

### Características Adicionales
- Implementación de factor sedentario (0.4)
- Integración de datos de seguimiento de salud en tiempo real
- Cálculos dinámicos de calorías
- Ajustes según nivel de actividad

## Notas Técnicas de Implementación

### Almacenamiento de Datos
- AsyncStorage para persistencia local de datos
- Integración con base de datos SQLite
- Sincronización de datos de salud

### Interfaz de Usuario
- Soporte para modo oscuro/claro
- Diseño responsivo
- Optimizaciones específicas por plataforma
- Navegación intuitiva

### Consideraciones de Rendimiento
- Carga eficiente de datos
- Cálculos optimizados
- Procesamiento en segundo plano
- Actualizaciones en tiempo real 