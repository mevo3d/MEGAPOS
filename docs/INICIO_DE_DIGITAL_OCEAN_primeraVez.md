# Instalación y Configuración de MEGAPOS - Digital Ocean Primera Vez

**Fecha:** 9 de febrero de 2026
**Servidor:** Digital Ocean Ubuntu
**Dominio:** pos.megamayoreo.com
**Documentación de instalación completa desde cero**

---

## 📋 ÍNDICE

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación del Proyecto](#instalación-del-proyecto)
3. [Configuración de Puertos](#configuración-de-puertos)
4. [Configuración de Nginx](#configuración-de-nginx)
5. [Configuración de SSL con Let's Encrypt](#configuración-de-ssl)
6. [Corrección de Socket.io](#corrección-de-socketio)
7. [Flujo de Trabajo Git](#flujo-de-trabajo-git)
8. [Comandos Útiles](#comandos-útiles)

---

## Requisitos Previos

### Servidor
- Ubuntu Server en Digital Ocean
- IP: 134.199.230.46
- Usuario: root

### Software Instalado
- Node.js v16+
- npm
- PostgreSQL (opcional, se usa SQLite por defecto)
- nginx
- certbot (Let's Encrypt)

### Proyecto Existente
- **morelos-congress-inventory** ya instalado en:
  - Frontend: puerto 7593
  - Backend: puerto 4329
  - Ubicación: `/root/Gestor/morelos-congress-inventory`

---

## Instalación del Proyecto

### 1. Clonar el Repositorio

```bash
# Crear directorio
mkdir -p /root/megapos

# Clonar desde GitHub
git clone https://github.com/mevo3d/MEGAPOS.git /root/megapos
```

### 2. Verificar Estructura

```bash
cd /root/megapos
ls -la
```

**Estructura verificada:**
```
/root/megapos/
├── backend/          # API REST/GraphQL
├── frontend/         # React + Vite
├── database/         # Scripts SQL
├── docs/            # Documentación
├── backend/data/    # Base de datos SQLite
└── .gitignore       # Configuración git
```

### 3. Instalar Dependencias

```bash
cd /root/megapos
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 4. Base de Datos

**El proyecto incluye base de datos SQLite:**
- Ubicación: `/root/megapos/backend/data/megamayoreo.db`
- Tablas: 54 tablas
- Usuarios precargados: 7 empleados

---

## Configuración de Puertos

### Puertos Asignados

| Proyecto | Frontend | Backend |
|----------|----------|---------|
| morelos-congress-inventory | 7593 | 4329 |
| **MEGAPOS** | **7595** | **4331** |

### Configuración Backend

**Archivo:** `/root/megapos/backend/.env`

```bash
# Copiar configuración SQLite
cp /root/megapos/backend/.env.sqlite /root/megapos/backend/.env
```

**Editar .env:**
```env
USE_SQLITE=true

# Servidor
PORT=4331
NODE_ENV=development

# JWT
JWT_SECRET=megamayoreo_secret_key_2024_ultra_secure_token
JWT_EXPIRES_IN=24h

# CORS
FRONTEND_URL=http://localhost:7595,http://localhost:4444,http://localhost:5173

# ... resto de configuración
```

### Configuración Frontend

**Archivo:** `/root/megapos/frontend/vite.config.js`

```javascript
export default defineConfig({
    server: {
        host: true,
        port: 7595,
        strictPort: true,
        allowedHosts: [
            'pos.megamayoreo.com',
            'localhost',
            '.megamayoreo.com'
        ],
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:4331',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://127.0.0.1:4331',
                ws: true,
            }
        }
    }
});
```

---

## Configuración de Nginx

### Virtual Host para MEGAPOS

**Archivo:** `/etc/nginx/sites-available/pos.megamayoreo.com`

```nginx
# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name pos.megamayoreo.com;
    return 301 https://$server_name$request_uri;
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    server_name pos.megamayoreo.com;

    ssl_certificate /etc/letsencrypt/live/pos.megamayoreo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pos.megamayoreo.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend MEGAPOS
    location / {
        proxy_pass http://127.0.0.1:7595;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API proxy a backend MEGAPOS
    location /api {
        proxy_pass http://127.0.0.1:4331;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io proxy
    location /socket.io {
        proxy_pass http://127.0.0.1:4331;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    access_log /var/log/nginx/pos-megapos-access.log;
    error_log /var/log/nginx/pos-megapos-error.log;
}
```

### Activar Sitio

```bash
# Crear enlace simbólico
ln -s /etc/nginx/sites-available/pos.megamayoreo.com /etc/nginx/sites-enabled/

# Verificar configuración
nginx -t

# Recargar nginx
systemctl reload nginx
```

---

## Configuración de SSL

### Obtener Certificado SSL

```bash
certbot --nginx -d pos.megamayoreo.com --non-interactive --agree-tos --email admin@megamayoreo.com --redirect
```

**Resultado:**
- Certificado instalado en `/etc/letsencrypt/live/pos.megamayoreo.com/`
- Válido hasta: 2026-05-10
- Renovación automática configurada

---

## Corrección de Socket.io

### Problema

El frontend intentaba conectarse al puerto 4847 en lugar de usar el proxy de nginx.

### Solución

**Archivo:** `/root/megapos/frontend/src/pages/admin/Dashboard.jsx`

**Antes:**
```javascript
const socketUrl = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:4847`;
```

**Después:**
```javascript
const socketUrl = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}`;
```

### Reiniciar Frontend

```bash
pkill -f "vite.*7595"
cd /root/megapos/frontend
npm run dev > /tmp/megapos-frontend.log 2>&1 &
```

---

## Iniciar Servicios

### Backend

```bash
cd /root/megapos/backend
node src/server.js &
```

### Frontend

```bash
cd /root/megapos/frontend
npm run dev > /tmp/megapos-frontend.log 2>&1 &
```

### Verificar Servicios

```bash
# Ver puertos activos
ss -tuln | grep -E ":(4331|7595)"

# Ver procesos
ps aux | grep -E "node.*megapos" | grep -v grep

# Probar backend
curl http://localhost:4331/api/health

# Probar frontend
curl https://pos.megamayoreo.com
```

---

## Flujo de Trabajo Git

### Arquitectura

```
┌─────────────────┐         ┌─────────────────┐
│  Tu PC (Local)  │         │   Servidor      │
│                 │         │  /root/megapos  │
└────────┬────────┘         └────────┬────────┘
         │                          │
         │          git push        │
         ├──────────────────────►   │
         │                          │
         │                          │ git pull
         │                          │
         │   ◄──────────────────────┤
         │         git pull         │
         │                          │
         ▼                          ▼
    ┌─────────────────────────────────┐
    │         GitHub                  │
    │   github.com/mevo3d/MEGAPOS    │
    └─────────────────────────────────┘
```

### En tu PC Local

```bash
# Bajar cambios
git pull origin main

# Trabajar normalmente
# Haz tus modificaciones...

# Subir cambios
git add .
git commit -m "Descripción del cambio"
git push origin main
```

### En el Servidor

```bash
cd /root/megapos
git pull origin main

# Si hay cambios en frontend
pkill -f "vite.*7595"
cd /root/megapos/frontend
npm run dev > /tmp/megapos-frontend.log 2>&1 &

# Si hay cambios en backend
cd /root/megapos/backend
node src/server.js &
```

---

## Configuración Permanente de GitHub Token

### Token Configurado

**Token:** Configurado permanentemente en el servidor (guardado en `~/.git-credentials`)
**Remote URL:** Configurada con credenciales embebidas

### Verificar Configuración

```bash
# Ver remote configurado
git remote -v

# Debe mostrar la URL con el token embebido
# origin  https://TOKEN@github.com/mevo3d/MEGAPOS.git (fetch)
# origin  https://TOKEN@github.com/mevo3d/MEGAPOS.git (push)
```

### Credenciales Guardadas

Las credenciales están guardadas en:
```bash
~/.git-credentials
```

### Si Necesitas Cambiar el Token

```bash
# Generar nuevo token en GitHub:
# https://github.com/settings/tokens

# Actualizar remote con nuevo token
cd /root/megapos
git remote set-url origin https://NUEVO_TOKEN@github.com/mevo3d/MEGAPOS.git

# Actualizar credenciales
cat > ~/.git-credentials << 'EOF'
https://NUEVO_TOKEN@github.com
EOF
chmod 600 ~/.git-credentials
```

### Comandos Git Sin Contraseña

Con esta configuración, puedes hacer git push y git pull sin necesidad de ingresar credenciales:

```bash
git push origin main    # Funciona sin pedir contraseña
git pull origin main    # Funciona sin pedir contraseña
```

---

## Comandos Útiles

### Ver Logs

```bash
# Frontend
tail -f /tmp/megapos-frontend.log

# Nginx access
tail -f /var/log/nginx/pos-megapos-access.log

# Nginx error
tail -f /var/log/nginx/pos-megapos-error.log
```

### Verificar Estado

```bash
# Ver puertos
ss -tuln | grep -E ":(4331|7595|7593|4329)"

# Ver procesos
ps aux | grep -E "(vite|node.*server)" | grep -v grep

# Verificar nginx
systemctl status nginx

# Verificar HTTPS
curl -I https://pos.megamayoreo.com
```

### Reiniciar Servicios

```bash
# Frontend
pkill -f "vite.*7595"
cd /root/megapos/frontend && npm run dev > /tmp/megapos-frontend.log 2>&1 &

# Backend
pkill -f "node.*server.js"
cd /root/megapos/backend && node src/server.js &

# Nginx
nginx -t && systemctl reload nginx
```

### Base de Datos SQLite

```bash
# Ver tabla de usuarios
sqlite3 /root/megapos/backend/data/megamayoreo.db "SELECT nombre, email FROM empleados LIMIT 5;"

# Ver tablas disponibles
sqlite3 /root/megapos/backend/data/megamayoreo.db ".tables"
```

---

## Archivos de Configuración

### Backend

- **.env:** `/root/megapos/backend/.env`
- **Server:** `/root/megapos/backend/src/server.js`
- **DB:** `/root/megapos/backend/data/megamayoreo.db`

### Frontend

- **Vite:** `/root/megapos/frontend/vite.config.js`
- **Dashboard:** `/root/megapos/frontend/src/pages/admin/Dashboard.jsx`
- **API:** `/root/megapos/frontend/src/utils/api.js`

### Nginx

- **Virtual Host:** `/etc/nginx/sites-available/pos.megamayoreo.com`
- **SSL:** `/etc/letsencrypt/live/pos.megamayoreo.com/`

---

## Resumen Final

### URLs de Acceso

| Servicio | URL |
|----------|-----|
| **MEGAPOS Frontend** | https://pos.megamayoreo.com |
| **MEGAPOS Backend API** | https://pos.megamayoreo.com/api |
| **morelos-inventory** | https://apps.mevo.com.mx |

### Puertos

| Servicio | Puerto |
|----------|--------|
| MEGAPOS Frontend | 7595 |
| MEGAPOS Backend | 4331 |
| morelos Frontend | 7593 |
| morelos Backend | 4329 |
| nginx HTTP | 80 |
| nginx HTTPS | 443 |

### Archivos que NO se suben a GitHub

- `backend/.env` (credenciales)
- `/etc/nginx/` (configuración del servidor)
- `node_modules/` (dependencias)

### Commit de Configuración

```bash
git commit -m "Configurar MEGAPOS para producción con dominio personalizado

- Actualizar vite.config.js: puerto 7595 y allowedHosts para producción
- Corregir socket.io en Dashboard: usar window.location.hostname
- Mejorar .gitignore: excluir configs específicas del servidor"
```

---

## Notas Importantes

1. **Base de datos SQLite** viene incluida en el repo
2. **Socket.io** ahora usa proxy de nginx (sin puerto hardcoded)
3. **nginx** redirige HTTP a HTTPS automáticamente
4. **git pull** no es automático, se debe hacer manualmente
5. **Los cambios en local NO afectan al servidor** hasta hacer git push + git pull

---

**Documentación creada:** 9 de febrero de 2026
**Última actualización:** Primera instalación completa
**Estado:** ✅ Funcionando en producción
