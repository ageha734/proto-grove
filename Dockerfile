FROM denoland/deno:alpine-2.3.1@sha256:0bcd1133073275fec13473f221f662627c7f2d8ab0b78f1b0662525e2efbe409

RUN apk add --no-cache git

WORKDIR /app

COPY deno.json ./
COPY deno.lock* ./
RUN deno install

COPY src/ ./src/

RUN deno cache src/main.ts

ENTRYPOINT ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "src/main.ts"]
