# 🐍 Ejercicios de Python

Aplicación web para practicar programación en Python. Los alumnos resuelven
ejercicios y reciben corrección automática; el profesor crea ejercicios y
revisa las entregas. El código Python se ejecuta **en el navegador** con
[Pyodide](https://pyodide.org), así que **no necesita servidor propio**.

## Páginas

| Página | Archivo | Para qué |
|--------|---------|----------|
| Alumno | `index.html` | Resolver ejercicios (feedback ✅/❌ instantáneo) |
| Admin  | `admin.html` | Crear ejercicios y revisar entregas (contraseña: `profe123`) |
| Repaso | `repaso.html` | Guía de estudio con ejemplos ejecutables |

## Correr en local

```bash
./iniciar.sh          # levanta un servidor en http://localhost:8000
# o bien:
python3 -m http.server 8000
```

Abre `http://localhost:8000/index.html`. (No abras los `.html` con doble clic:
Pyodide y el editor se cargan por HTTPS y funcionan mejor servidos por HTTP.)

## Estructura

```
.
├── index.html / admin.html / repaso.html   páginas
├── iniciar.sh                              script para levantar en local
├── css/styles.css
└── js/
    ├── db.js       capa de datos AISLADA (hoy localStorage; luego Supabase)
    ├── seed.js     ejercicios iniciales (versionados)
    ├── editor.js   editor de código (Ace: resaltado, Tab, autocompletado)
    ├── runner.js   motor Pyodide (ejecuta y evalúa el código)
    ├── student.js  lógica de la vista del alumno
    ├── admin.js    lógica del panel del profesor
    └── repaso.js   guía de estudio
```

## Despliegue (GitHub Pages)

1. Sube este repo a GitHub.
2. **Settings → Pages → Source: `main` / root** → *Save*.
3. Queda publicado en `https://TU_USUARIO.github.io/TU_REPO/`.

## Estado

- ✅ Funciona con `localStorage` (los datos viven en cada navegador).
- ⏳ **Pendiente:** base de datos compartida con **Supabase** para que sea
  multi-alumno (ejercicios y entregas sincronizados en la nube). La capa de
  datos está aislada en `js/db.js` para facilitar el cambio.
