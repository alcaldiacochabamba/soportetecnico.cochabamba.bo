FROM node:20.17.0 as builder
WORKDIR /app

# Copiar y instalar las dependencias
COPY package*.json ./
RUN npm install

# Fase de producción
FROM node:20.17.0 as prod
WORKDIR /app

# Copiar las dependencias de la fase de builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar el código fuente
COPY . .

# Configurar la zona horaria
ENV TZ=America/La_Paz
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone



# Puerto por defecto
EXPOSE 3001

# Comando para iniciar la aplicación
CMD ["node", "app.js"]


