FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 4847

# Comando de desarrollo con nodemon para hot-reload
CMD ["npm", "run", "dev"]
