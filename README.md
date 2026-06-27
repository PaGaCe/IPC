# FIFA Liga — Guía de despliegue

Esta app ya no depende de Claude: usa **Firebase (Firestore)** como base de
datos compartida en tiempo real, y se despliega como una web normal con
**Vercel**. Sigue estos pasos una sola vez; después, cada cambio se publica
con un simple `git push`.

---

## 1b. Activar el inicio de sesión con Google

1. En la consola de Firebase, ve a **Compilación → Authentication**.
2. Pulsa **"Comenzar"** si es la primera vez.
3. En la pestaña **Sign-in method**, pulsa **"Agregar nuevo proveedor"** → elige **Google**.
4. Activa el interruptor, elige un correo de soporte del proyecto, y pulsa **Guardar**.
5. Ve a la pestaña **Settings** dentro de Authentication → sección **Authorized domains** → comprueba que tu dominio de Vercel (`tu-proyecto.vercel.app`) aparece en la lista. Si no, pulsa **"Add domain"** y añádelo.

---

## 1. Crear el proyecto de Firebase (gratis)

1. Ve a https://console.firebase.google.com y haz clic en **"Crear un proyecto"**.
2. Ponle un nombre (ej. `fifa-liga`) y sigue el asistente (puedes desactivar
   Google Analytics, no lo necesitamos).
3. Dentro del proyecto, en el menú lateral ve a **Compilación → Firestore Database**.
4. Pulsa **"Crear base de datos"** → elige una ubicación cercana → empieza en
   **modo de prueba** (lo ajustaremos después con reglas de seguridad).
5. Ve a **Configuración del proyecto** (icono de engranaje) → pestaña
   **General** → bájala hasta "Tus apps" → pulsa el icono **`</>`** (Web).
6. Ponle un apodo a la app y pulsa "Registrar app". Firebase te mostrará un
   bloque `firebaseConfig` con varias claves (`apiKey`, `authDomain`, etc.) —
   **cópialas, las necesitas en el paso 3**.

### Reglas de seguridad de Firestore (importante)

Por defecto, el modo de prueba permite leer/escribir a cualquiera durante 30
días y luego se bloquea todo. Para este proyecto (sin login de usuarios) unas
reglas simples y permanentes son suficientes, ya que el "código de liga" de 6
caracteres ya actúa como una contraseña compartida:

En Firestore → pestaña **Reglas**, sustituye el contenido por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shared_state/{docId} {
      allow read, write: if true;
    }
    match /device_state/{docId} {
      allow read, write: if true;
    }
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Pulsa **Publicar**.

---

## 2. Instalar dependencias del proyecto

Necesitas [Node.js](https://nodejs.org) instalado (versión 18 o más reciente).

```bash
cd fifa-liga-app
npm install
```

---

## 3. Configurar las claves de Firebase

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
2. Abre `.env` y pega los valores que copiaste en el paso 1.6. Quedará así
   (con tus valores reales, no estos de ejemplo):
   ```
   VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   VITE_FIREBASE_AUTH_DOMAIN=fifa-liga-XXXXX.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=fifa-liga-XXXXX
   VITE_FIREBASE_STORAGE_BUCKET=fifa-liga-XXXXX.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   ```
3. **Nunca subas este archivo `.env` a GitHub** — ya está en `.gitignore`,
   así que `git` lo ignorará automáticamente.

---

## 4. Probar en local

```bash
npm run dev
```

Abre la URL que te muestre (normalmente `http://localhost:5173`). Prueba a
crear una liga, y abre la misma URL en otra pestaña/dispositivo para
comprobar que el código de liga sincroniza correctamente entre ambos.

---

## 5. Subir el código a GitHub

1. Crea una cuenta en https://github.com si no tienes una.
2. Crea un repositorio nuevo (puede ser privado), sin inicializarlo con
   ningún archivo.
3. En tu terminal, dentro de la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Primera versión de FIFA Liga"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

---

## 6. Desplegar en Vercel (gratis)

1. Ve a https://vercel.com y crea una cuenta (puedes entrar directamente con
   tu cuenta de GitHub).
2. Pulsa **"Add New..." → "Project"**.
3. Selecciona el repositorio que acabas de subir y pulsa **"Import"**.
4. Vercel detectará automáticamente que es un proyecto Vite — no hace falta
   tocar nada de la configuración de build.
5. **Antes de pulsar "Deploy"**, despliega la sección "Environment Variables"
   y añade las mismas 6 variables que tienes en tu `.env` local (cópialas
   una por una, con el mismo nombre `VITE_FIREBASE_...`).
6. Pulsa **"Deploy"**. En menos de un minuto tendrás una URL pública del
   tipo `tu-proyecto.vercel.app` — ¡esa es la que compartes con tus amigos!

---

## 7. Actualizar la app después de cada cambio

Cada vez que quieras publicar un cambio (tuyo o uno que yo te prepare):

```bash
git add .
git commit -m "Describe aquí el cambio"
git push
```

Vercel detecta el `push` automáticamente, reconstruye la app, y la nueva
versión queda publicada en la misma URL en menos de un minuto. No hay que
repetir ningún otro paso de configuración.

---

## Notas técnicas

- **Tiempo real**: gracias a Firestore, los cambios de otros jugadores
  (pujas, ofertas, nuevos equipos uniéndose) aparecen al instante para todos,
  sin necesidad de recargar la página.
- **Límite de tamaño**: cada liga se guarda en un único documento de
  Firestore, que tiene un límite de 1MB. Con escudos de equipo en fotos muy
  grandes podrías acercarte a ese límite en ligas con muchos equipos. Si
  llegado el caso da problemas, se puede resolver moviendo los escudos a
  Firebase Storage en vez de guardarlos dentro del documento — avísame si
  llegas a ese punto.
- **Coste**: el plan gratuito de Firebase ("Spark") incluye 1GB de
  almacenamiento y 50.000 lecturas/20.000 escrituras al día, más que
  suficiente para una liga entre amigos. Vercel también es gratuito para
  este tipo de uso personal.