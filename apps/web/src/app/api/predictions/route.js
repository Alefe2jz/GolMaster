import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get user predictions
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("match_id");
    const userId = searchParams.get("user_id") || session.user.id; // Allow checking other users' predictions
    const limit = parseInt(searchParams.get("limit")) || 50;
    const offset = parseInt(searchParams.get("offset")) || 0;

    let query = `
      SELECT 
        p.id,
        p.match_id,
        p.predicted_home_score,
        p.predicted_away_score,
        p.is_correct,
        p.created_at,
        p.updated_at,
        m.match_date,
        m.stage,
        m.group_name,
        m.home_score as actual_home_score,
        m.away_score as actual_away_score,
        m.status as match_status,
        ht.name as home_team_name,
        ht.code as home_team_code,
        ht.flag_emoji as home_team_flag,
        at.name as away_team_name,
        at.code as away_team_code,
        at.flag_emoji as away_team_flag
      FROM predictions p
      JOIN matches m ON p.match_id = m.id
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE p.user_id = $1
    `;

    const values = [userId];
    let paramCount = 1;

    if (matchId) {
      paramCount++;
      query += ` AND p.match_id = $${paramCount}`;
      values.push(matchId);
    }

    query += ` ORDER BY m.match_date ASC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const predictions = await sql(query, values);

    return Response.json({
      predictions: predictions || [],
      total: predictions?.length || 0,
    });
  } catch (error) {
    console.error("GET /api/predictions error:", error);
    return Response.json(
      { error: "Failed to fetch predictions" },
      { status: 500 },
    );
  }
}

// Create or update prediction
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { match_id, predicted_home_score, predicted_away_score } = body;

    if (
      !match_id ||
      typeof predicted_home_score !== "number" ||
      typeof predicted_away_score !== "number"
    ) {
      return Response.json(
        { error: "Missing or invalid required fields" },
        { status: 400 },
      );
    }

    if (predicted_home_score < 0 || predicted_away_score < 0) {
      return Response.json(
        { error: "Scores cannot be negative" },
        { status: 400 },
      );
    }

    // Check if match exists and hasn't started yet
    const matches = await sql`
      SELECT id, match_date, status 
      FROM matches 
      WHERE id = ${match_id}
    `;

    if (!matches || matches.length === 0) {
      return Response.json({ error: "Match not found" }, { status: 404 });
    }

    const match = matches[0];
    const now = new Date();
    const matchDate = new Date(match.match_date);

    if (match.status === "finished" || match.status === "live") {
      return Response.json(
        { error: "Cannot predict on finished or live matches" },
        { status: 400 },
      );
    }

    // Use ON CONFLICT to handle upsert (create or update)
    const result = await sql`
      INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score)
      VALUES (${session.user.id}, ${match_id}, ${predicted_home_score}, ${predicted_away_score})
      ON CONFLICT (user_id, match_id)
      DO UPDATE SET
        predicted_home_score = EXCLUDED.predicted_home_score,
        predicted_away_score = EXCLUDED.predicted_away_score,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    // Fetch the created/updated prediction with full details
    const prediction = await sql`
      SELECT 
        p.id,
        p.match_id,
        p.predicted_home_score,
        p.predicted_away_score,
        p.is_correct,
        p.created_at,
        p.updated_at,
        m.match_date,
        m.stage,
        m.group_name,
        m.home_score as actual_home_score,
        m.away_score as actual_away_score,
        m.status as match_status,
        ht.name as home_team_name,
        ht.code as home_team_code,
        ht.flag_emoji as home_team_flag,
        at.name as away_team_name,
        at.code as away_team_code,
        at.flag_emoji as away_team_flag
      FROM predictions p
      JOIN matches m ON p.match_id = m.id
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE p.id = ${result[0].id}
    `;

    return Response.json({ prediction: prediction[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/predictions error:", error);
    return Response.json(
      { error: "Failed to create prediction" },
      { status: 500 },
    );
  }
}
