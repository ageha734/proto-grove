FROM denoland/deno:alpine-2.3.1

RUN apk add --no-cache git

WORKDIR /app

COPY deno.json ./
COPY deno.lock* ./
RUN deno install

COPY src/ ./src/

RUN deno cache src/main.ts

ENTRYPOINT ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "src/main.ts"]
