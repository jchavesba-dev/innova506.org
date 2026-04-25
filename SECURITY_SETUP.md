# Configuración de seguridad sin costo - INNOVA 506

## Antes de publicar el campus actualizado

1. En Firebase Console, abre el proyecto `campus-innova506`.
2. En Authentication > Sign-in method, habilita:
   - Email/Password para admin y docentes.
   - Anonymous para que los estudiantes puedan iniciar una sesión técnica antes de validar su código.
3. En Authentication > Users, crea la cuenta admin con el correo `innova506@hotmail.com` y una contraseña privada que no se guarde en el repositorio ni en este documento.
4. Publica el sitio actualizado.
5. Ingresa como admin usando correo/contraseña. Al entrar, el campus ejecuta la migración de seguridad: elimina contraseñas locales heredadas y refuerza códigos débiles de estudiantes.
6. Para cada docente creado en el campus, crea también su usuario en Firebase Auth con el mismo correo.
7. Los estudiantes no necesitan contraseña: se les comparte su código `INNOVA-XXXX-XXXX-XXXX`.

## Sobre `firestore.rules`

El archivo `firestore.rules` incluido es el objetivo seguro para una estructura normalizada por colecciones (`userProfiles`, `courses`, `enrollments`, `submissions`, `grades`, `accessCodes`).

No despliegues esas reglas sobre el LMS actual basado en la colección legacy `lms` hasta migrar los datos a esa estructura, porque `lms` queda admin-only por diseño. Mientras el campus siga leyendo `lms`, la seguridad real depende de activar Firebase Auth y hacer la migración gradual de datos.

## Criterio de costo

Estos cambios usan GitHub Pages, Firebase Auth, Firestore y Formsubmit. No agregan Cloud Functions, servidores, planes pagos ni servicios externos nuevos.