FROM node:18-bullseye

WORKDIR /app

# نسخ كل الملفات أولاً (عشان package-lock.json)
COPY . .

# npm ci بيمسح node_modules المحلية ويركب من الصفر
# عشان الـ native modules تكون مبنية ضد Node.js v18
RUN npm ci --only=production

# إنشاء مجلد البيانات وجعله قابل للكتابة
RUN mkdir -p /app/data && chmod 777 /app/data

# فتح المنفذ
EXPOSE 8080

# تشغيل التطبيق
CMD ["node", "server.js"]
