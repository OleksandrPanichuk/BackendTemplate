
FROM node:24-alpine


WORKDIR /app


COPY package.json  ./


RUN npm install


COPY . .

ENV NODE_ENV=development

EXPOSE 8080

CMD sh -c "npx prisma generate  && npm run start:dev"