# Image de production d'Équipia.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
COPY --from=build /app ./
# Toutes les données (comptes, entreprises, fichiers, clé de chiffrement) sont dans /data :
# montez-y un volume persistant et sauvegardez-le.
VOLUME /data
EXPOSE 3000
CMD ["npm", "start"]
