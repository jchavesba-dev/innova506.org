# INNOVA506 | Integración segura con GitHub Pages y Firebase

ESTADO: Código listo para revisión técnica, **no publicado ni conectado**. Ruta objetivo: `jchavesba-dev/innova506.org` rama `master`.

## Estructura de incorporación
Copie `verificar/`, `admin/certificados/` y `certificados/` a la raíz del repositorio. No reemplace ni altere `campus/`, `index.html`, `firebase.json` de la raíz ni `firestore.rules` existentes.

- `/verificar/`: consulta pública contra la función `verifyCertificate`. Jamás acepta un código como válido únicamente por su formato.
- `/admin/certificados/`: panel privado. Funciones protegidas con token y claim `certificatesAdmin` emitida en servidor.
- `/certificados/assets/`: estilos y cliente; `config.js` ES SOLO UN MARCADOR INACTIVO, no contiene claves privadas y deberá sustituirse con los datos de la aplicación web del Firebase dedicado.
- `/certificados/backend/`: Cloud Functions, ejemplo de reglas que niegan acceso cliente a colecciones privadas, pruebas.

## Bloqueo de activación
No fusionar ni anunciar consulta pública hasta tener un proyecto Firebase dedicado, App Check, Authentication y Cloud Functions configurados y verificados. El proyecto actual `campus-innova506` debe conservar sus reglas y acceso intactos. El `firebase.json` del backend está aislado en su carpeta para que el despliegue no sustituya el del Campus.

## Secuencia de despliegue supervisado
1. Crear o seleccionar un proyecto Firebase independiente para los certificados. Activar Firestore, Authentication (Google), App Check con reCAPTCHA Enterprise, Functions y facturación compatible. Registrar `innova506.org` entre los dominios autorizados.
2. Desde `certificados/backend` seleccionar explícitamente ese proyecto con `firebase use --add`, y revisar que su ID **NO** sea `campus-innova506`. Desplegar `firestore.rules.EXAMPLE` como reglas INICIALES del proyecto dedicado tras verificar su contenido; no copiar estas reglas sobre las del Campus.
3. Editar `certificados/assets/config.js` únicamente con valores públicos de configuración web Firebase y clave pública App Check. No publicar secretos de cuenta de servicio, contraseñas ni llaves privadas. `config.js` del paquete viene con valores REEMPLAZAR para fallar de forma segura.
4. Ejecutar `cd certificados/backend/functions && npm install && npm test`; luego, desde `certificados/backend`, `firebase deploy --only functions:innova506-certificates --project ID_DE_PROYECTO_DEDICADO` y desplegar reglas exclusivamente en ese proyecto. No usar `firebase deploy` sin filtros ni apuntar al Campus.
5. Dar rol solo al UID administrativo legítimo mediante `node manage-admin.mjs UID grant` desde entorno de confianza con credenciales administrativas (no en GitHub). Revisar en privado el UID y renovar sesión. La lectura pública es una función con App Check, no acceso directo a Firestore.
6. Probar códigos inexistentes, vigentes de PRUEBA, anulados y sustituidos, accesos no autorizados y campos ocultos. Solo entonces habilitar el enlace desde la página principal, sustituyendo el envío por WhatsApp o manteniéndolo como alternativa.

## Datos y alcance
La colección privada almacena información personal; la respuesta pública incluye nombre parcialmente oculto y datos académicos necesarios. No hay registro histórico automático; requiere documento original y validación. El código QR y la consulta solo verifican la emisión por INNOVA506, no aval ni puntaje MEP. No usar registros planificados de bitácora como accesos efectivos.

## Integración visual con el sitio actual
La página principal ya tiene formulario de **solicitud de verificación por WhatsApp**. Se conserva sin alteraciones hasta que el nuevo verificador esté operativo. Luego, con aprobación, cambiar la función `verify-form` en `index.html` para redirigir a `/verificar/?codigo=...` y mantener un enlace de atención manual. Por ahora no modificar ese código.

## Situación de permisos GitHub
La conexión disponible permite lectura, pero la creación de la rama devolvió HTTP 403 (`Resource not accessible by integration`). No se pudo publicar este paquete ni crear una solicitud de cambios. No implica fallo del repositorio; revisar los permisos de acciones de escritura de GitHub en ChatGPT/GitHub App. Evite compartir tokens o contraseñas.
