# 1. Aşama: Bağımlılıkların yüklenmesi
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Bağımlılık dosyalarını kopyala
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Aşama: Uygulamanın derlenmesi (Build)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js telemetrisini devre dışı bırakmak isterseniz:
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# 3. Aşama: Çalışma ortamı (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Güvenlik için root olmayan bir kullanıcı oluşturun
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Sadece gerekli dosyaları kopyalayın
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]
