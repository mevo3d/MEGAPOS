FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Exponer puerto Vite
EXPOSE 5173

# Comando de desarrollo con hot-reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
