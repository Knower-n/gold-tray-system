export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API routes هنستخدمها بعدين مع قاعدة البيانات
    if (url.pathname.startsWith("/api/")) {
      return new Response("API is ready", {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    // عرض ملفات الموقع
    return env.ASSETS.fetch(request);
  }
};
