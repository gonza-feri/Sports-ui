# DreamLeague / Sports UI

Interfaz web para gestionar equipos y jugadores de fútbol, con noticias integradas y un backend simulado REST (json-server). Este README recoge el estado actual del proyecto y enlaza al repositorio donde se puede seguir el historial de cambios y el progreso completo.

> Repositorio con historial y progreso: https://github.com/gonza-feri/DreamLeague

## Resumen
DreamLeague es una aplicación **React + TypeScript** para crear, editar y gestionar equipos y jugadores, montar alineaciones (drag & drop), y mostrar noticias relacionadas con cada equipo. El backend se simula con **json-server** para facilitar el desarrollo y la entrega.

(Este README parte del contenido original del proyecto y se ha actualizado para reflejar el estado actual).

## Características principales
- **Gestión de equipos**: ver, crear, editar y eliminar equipos.  
- **Gestión de jugadores**: añadir jugadores, asignarlos a equipos, editar posiciones y fotos.  
- **Alineaciones**: arrastrar y soltar jugadores en el campo; persistencia de la alineación en el equipo.  
- **Noticias por equipo**: integración con API de noticias para mostrar artículos relevantes.  
- **Búsqueda y filtros**: búsqueda de equipos y jugadores.  
- **Simulación de API**: json-server para endpoints REST durante desarrollo.

## Tech stack
- **React + TypeScript**  
- **Axios** para llamadas HTTP  
- **React Router** para navegación  
- **json-server** para simular backend REST  
- **CSS** (estilos del proyecto)

## Endpoints (json-server)
- `GET /teams` — listar equipos  
- `GET /teams/:id` — obtener equipo (incluye `players` embebidos)  
- `POST /teams` — crear equipo  
- `PUT /teams/:id` — actualizar equipo (se usa para persistir `players` y `lineup`)  
- `DELETE /teams/:id` — eliminar equipo

> Nota: el proyecto actualiza y persiste el array `team.players` dentro de `PUT /teams/:id` en lugar de operar sobre un endpoint `/players` separado.

## Instalación y ejecución (desarrollo)
1. Clona el repositorio:
```bash
git clone https://github.com/gonza-feri/DreamLeague.git
cd DreamLeague
