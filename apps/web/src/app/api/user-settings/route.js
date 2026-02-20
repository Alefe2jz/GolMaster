import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get user settings
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await sql`
      SELECT 
        id,
        user_id,
        language,
        timezone,
        notifications_enabled,
        created_at,
        updated_at
      FROM user_settings 
      WHERE user_id = ${session.user.id}
    `;

    // If no settings exist, create default ones
    if (!settings || settings.length === 0) {
      const defaultSettings = await sql`
        INSERT INTO user_settings (user_id, language, timezone, notifications_enabled)
        VALUES (${session.user.id}, 'pt', 'America/Sao_Paulo', true)
        RETURNING id, user_id, language, timezone, notifications_enabled, created_at, updated_at
      `;

      return Response.json({ settings: defaultSettings[0] });
    }

    return Response.json({ settings: settings[0] });
  } catch (error) {
    console.error("GET /api/user-settings error:", error);
    return Response.json(
      { error: "Failed to fetch user settings" },
      { status: 500 },
    );
  }
}

// Update user settings
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { language, timezone, notifications_enabled } = body;

    // Build dynamic update query
    const setClauses = [];
    const values = [];
    let paramCount = 0;

    if (language && ["pt", "en"].includes(language)) {
      paramCount++;
      setClauses.push(`language = $${paramCount}`);
      values.push(language);
    }

    if (timezone && typeof timezone === "string") {
      paramCount++;
      setClauses.push(`timezone = $${paramCount}`);
      values.push(timezone);
    }

    if (typeof notifications_enabled === "boolean") {
      paramCount++;
      setClauses.push(`notifications_enabled = $${paramCount}`);
      values.push(notifications_enabled);
    }

    if (setClauses.length === 0) {
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Add updated_at
    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());

    // Add user_id for WHERE clause
    paramCount++;
    values.push(session.user.id);

    // Use ON CONFLICT to handle upsert (create or update)
    const upsertQuery = `
      INSERT INTO user_settings (user_id, ${language ? "language," : ""} ${timezone ? "timezone," : ""} ${typeof notifications_enabled === "boolean" ? "notifications_enabled," : ""} updated_at)
      VALUES ($${paramCount}, ${language ? "$1," : ""} ${timezone ? `$${language ? "2" : "1"},` : ""} ${typeof notifications_enabled === "boolean" ? `$${(language ? 1 : 0) + (timezone ? 1 : 0) + 1},` : ""} $${paramCount - 1})
      ON CONFLICT (user_id)
      DO UPDATE SET ${setClauses.join(", ")}
      RETURNING id, user_id, language, timezone, notifications_enabled, created_at, updated_at
    `;

    // Simplify with a direct update since we know the user exists
    const updateQuery = `
      INSERT INTO user_settings (user_id, language, timezone, notifications_enabled, updated_at)
      VALUES ($${paramCount}, 
        COALESCE($${language ? "1" : "NULL"}, 'pt'), 
        COALESCE($${timezone ? (language ? "2" : "1") : "NULL"}, 'America/Sao_Paulo'), 
        COALESCE($${typeof notifications_enabled === "boolean" ? (language ? "2" : "1") + (timezone ? "1" : "0") : "NULL"}, true),
        $${paramCount - 1})
      ON CONFLICT (user_id)
      DO UPDATE SET ${setClauses.join(", ")}
      RETURNING id, user_id, language, timezone, notifications_enabled, created_at, updated_at
    `;

    // Let's use a simpler approach
    let result;

    // First try to update
    const updateSimpleQuery = `
      UPDATE user_settings 
      SET ${setClauses.join(", ")} 
      WHERE user_id = $${paramCount}
      RETURNING id, user_id, language, timezone, notifications_enabled, created_at, updated_at
    `;

    result = await sql(updateSimpleQuery, values);

    // If no rows were updated, insert new record
    if (!result || result.length === 0) {
      const insertResult = await sql`
        INSERT INTO user_settings (
          user_id, 
          language, 
          timezone, 
          notifications_enabled
        ) VALUES (
          ${session.user.id}, 
          ${language || "pt"}, 
          ${timezone || "America/Sao_Paulo"}, 
          ${notifications_enabled !== undefined ? notifications_enabled : true}
        ) RETURNING id, user_id, language, timezone, notifications_enabled, created_at, updated_at
      `;
      result = insertResult;
    }

    return Response.json({ settings: result[0] });
  } catch (error) {
    console.error("PUT /api/user-settings error:", error);
    return Response.json(
      { error: "Failed to update user settings" },
      { status: 500 },
    );
  }
}
