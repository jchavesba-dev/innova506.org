# Publicación segura del Campus INNOVA 506

Esta versión elimina el almacenamiento global en `lms` y utiliza colecciones separadas con control por identidad:

- `userProfiles`: perfil y rol de cada cuenta.
- `studentCodes`: credenciales estudiantiles, visibles únicamente para el administrador.
- `courses`: cursos y contenidos.
- `enrollments`: matrículas de estudiantes y asignaciones de docentes.
- `submissions`: cuestionarios y tareas.
- `views`: avance de materiales.
- `settings`: configuración académica.

## Requisitos previos

1. En Firebase Console, proyecto `campus-innova506`, abra **Authentication > Sign-in method**.
2. Active **Email/Password**.
3. Desactive **Anonymous**; esta versión ya no lo utiliza.
4. En **Authentication > Users**, confirme que existe la cuenta `innova506@hotmail.com` y cambie su contraseña si apareció alguna vez en un archivo o conversación.
5. No guarde esa contraseña en GitHub, Firestore ni en este documento.

## Orden de publicación

Como el campus está vacío, publique primero las reglas y luego la página:

```bash
firebase login
firebase deploy --only firestore:rules --project campus-innova506
git add campus/index.html firestore.rules firebase.json SECURITY_SETUP.md
git commit -m "Seguridad: aislar datos del campus por usuario y curso"
git push origin master
```

Después abra `https://innova506.org/campus/` e ingrese con la cuenta administradora. El primer acceso crea de manera controlada el perfil administrador y, si no existen cursos, los seis cursos base.

## Comprobaciones posteriores

1. Cree un estudiante de prueba y copie su código.
2. Inscríbalo en un solo curso.
3. Cierre sesión e ingrese con el código.
4. Confirme que solo aparece el curso asignado.
5. Cree un docente de prueba con una contraseña temporal y asígnele un curso.
6. Confirme que el docente solo ve ese curso y sus estudiantes.
7. En Firestore, confirme que no se crean nuevos documentos en `lms`.
8. Elimine los documentos antiguos de `lms` únicamente después de verificar el acceso administrador.

## Límites conocidos

El campus continúa siendo una aplicación estática en GitHub Pages. Las reglas impiden el acceso anónimo y el acceso cruzado a perfiles, matrículas, entregas y progreso. Sin embargo, los cuestionarios se califican en el navegador; para evaluaciones de alto riesgo, la calificación debe trasladarse a una función de servidor confiable.
