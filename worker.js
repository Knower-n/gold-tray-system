export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================
    // GET: عرض كل الطرائح
    // =========================
    if (url.pathname === "/api/trays" && request.method === "GET") {

      const result = await env.DB
        .prepare(`
          SELECT
            id,
            tray_number,
            tray_name,
            current_department,
            current_weight,
            updated_at
          FROM trays
          ORDER BY tray_number
        `)
        .all();

      return Response.json(result.results);
    }


    // =========================
    // POST: إضافة طريحة جديدة
    // =========================
    if (url.pathname === "/api/trays" && request.method === "POST") {

      try {
        const data = await request.json();

        const trayNumber = String(data.tray_number || "").trim();
        const trayName = String(data.tray_name || "").trim();
        const department = String(data.current_department || "").trim();
        const weight = Number(data.current_weight);

        if (!trayNumber || !trayName || !department || !Number.isFinite(weight)) {
          return Response.json(
            { error: "بيانات غير صحيحة" },
            { status: 400 }
          );
        }

        await env.DB
          .prepare(`
            INSERT INTO trays (
              tray_number,
              tray_name,
              current_department,
              current_weight
            )
            VALUES (?, ?, ?, ?)
          `)
          .bind(
            trayNumber,
            trayName,
            department,
            weight
          )
          .run();

        return Response.json({
          success: true,
          message: "تمت إضافة الطريحة"
        });

      } catch (error) {

        return Response.json(
          {
            error: error.message
          },
          { status: 500 }
        );
      }
    }


    // =========================
    // API غير موجود
    // =========================
    if (url.pathname.startsWith("/api/")) {

      return Response.json(
        {
          error: "API endpoint not found"
        },
        { status: 404 }
      );
    }


    // =========================
    // عرض الموقع
    // =========================
    return env.ASSETS.fetch(request);
  }
};
