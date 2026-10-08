export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==========================================
    // GET ALL TRAYS
    // ==========================================

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


    // ==========================================
    // ADD NEW TRAY
    // ==========================================

    if (url.pathname === "/api/trays" && request.method === "POST") {

      try {

        const data = await request.json();

        const trayNumber = String(data.tray_number || "").trim();
        const trayName = String(data.tray_name || "").trim();
        const department = String(data.current_department || "").trim();
        const weight = Number(data.current_weight);

        if (
          !trayNumber ||
          !trayName ||
          !department ||
          !Number.isFinite(weight)
        ) {

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


    // ==========================================
    // UPDATE TRAY + RECORD MOVEMENT
    // ==========================================

    if (
      url.pathname === "/api/trays/update" &&
      request.method === "POST"
    ) {

      try {

        const data = await request.json();

        const trayNumber = String(data.tray_number || "").trim();
        const department = String(data.department || "").trim();

        const weightIn = Number(data.weight_in);
        const weightOut = Number(data.weight_out);

        if (
          !trayNumber ||
          !department ||
          !Number.isFinite(weightIn) ||
          !Number.isFinite(weightOut)
        ) {

          return Response.json(
            {
              error: "من فضلك أدخل كل البيانات بشكل صحيح"
            },
            {
              status: 400
            }
          );

        }


        if (weightIn < 0 || weightOut < 0) {

          return Response.json(
            {
              error: "الوزن لا يمكن أن يكون بالسالب"
            },
            {
              status: 400
            }
          );

        }


        if (weightOut > weightIn) {

          return Response.json(
            {
              error: "الوزن الخارج لا يمكن أن يكون أكبر من الداخل"
            },
            {
              status: 400
            }
          );

        }


        // الحصول على الطريحة

        const tray = await env.DB
          .prepare(`
            SELECT *
            FROM trays
            WHERE tray_number = ?
          `)
          .bind(trayNumber)
          .first();


        if (!tray) {

          return Response.json(
            {
              error: "الطريحة غير موجودة"
            },
            {
              status: 404
            }
          );

        }


        // حساب الخسارة

        const loss = weightIn - weightOut;


        // التاريخ والوقت

        const now = new Date();

        const date = now
          .toISOString()
          .slice(0, 10);

        const time = now
          .toISOString()
          .slice(11, 19);


        // تسجيل الحركة

        await env.DB
          .prepare(`
            INSERT INTO tray_movements (
              tray_id,
              department,
              weight_in,
              weight_out,
              loss,
              movement_date,
              movement_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            tray.id,
            department,
            weightIn,
            weightOut,
            loss,
            date,
            time
          )
          .run();


        // تحديث حالة الطريحة

        await env.DB
          .prepare(`
            UPDATE trays
            SET
              current_department = ?,
              current_weight = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `)
          .bind(
            department,
            weightOut,
            tray.id
          )
          .run();


        return Response.json({

          success: true,

          message: "تم تحديث الطريحة بنجاح",

          tray_number: trayNumber,

          weight_in: weightIn,

          weight_out: weightOut,

          loss: loss

        });


      } catch (error) {

        return Response.json(

          {
            error: error.message
          },

          {
            status: 500
          }

        );

      }

    }


    // ==========================================
    // API NOT FOUND
    // ==========================================

    if (url.pathname.startsWith("/api/")) {

      return Response.json(
        {
          error: "API endpoint not found"
        },
        {
          status: 404
        }
      );

    }


    // ==========================================
    // STATIC WEBSITE
    // ==========================================

    return env.ASSETS.fetch(request);

  }
};
