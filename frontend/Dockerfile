# Etapa de construcción
FROM node:20.17.0 as builder
WORKDIR /code

COPY package.json package-lock.json ./
RUN npm install --force
RUN npm install -g @angular/cli@17

COPY . .

RUN npm run build -- --configuration=development

# Etapa de producción
FROM nginx:1.25.4-alpine
WORKDIR /usr/share/nginx/html

COPY --from=builder /code/dist/fuse .  

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
ENV TZ=America/La_Paz
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]


