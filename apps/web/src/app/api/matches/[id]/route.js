import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get single match by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const matches = await sql`
      SELECT 
        m.id, 
        m.fifa_match_id,
        m.match_date,
        m.stage,
        m.group_name,
        m.home_score,
        m.away_score,
        m.status,
        m.tv_channel,
        m.streaming_platform,
        ht.name as home_team_name,
        ht.code as home_team_code,
        ht.flag_emoji as home_team_flag,
        at.name as away_team_name,
        at.code as away_team_code,
        at.flag_emoji as away_team_flag,
        s.name as stadium_name,
        s.city as stadium_city,
        s.country as stadium_country,
        s.capacity as stadium_capacity
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN stadiums s ON m.stadium_id = s.id
      WHERE m.id = ${id}
    `;

    if (!matches || matches.length === 0) {
      return Response.json({ error: "Match not found" }, { status: 404 });
    }

    return Response.json({ match: matches[0] });
  } catch (error) {
    console.error("GET /api/matches/[id] error:", error);
    return Response.json({ error: "Failed to fetch match" }, { status: 500 });
  }
}

// Update match (typically scores and status)
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const { home_score, away_score, status, tv_channel, streaming_platform } =
      body;

    // Build dynamic update query
    const setClauses = [];
    const values = [];
    let paramCount = 0;

    if (typeof home_score === "number") {
      paramCount++;
      setClauses.push(`home_score = $${paramCount}`);
      values.push(home_score);
    }

    if (typeof away_score === "number") {
      paramCount++;
      setClauses.push(`away_score = $${paramCount}`);
      values.push(away_score);
    }

    if (status && ["scheduled", "live", "finished"].includes(status)) {
      paramCount++;
      setClauses.push(`status = $${paramCount}`);
      values.push(status);
    }

    if (tv_channel !== undefined) {
      paramCount++;
      setClauses.push(`tv_channel = $${paramCount}`);
      values.push(tv_channel);
    }

    if (streaming_platform !== undefined) {
      paramCount++;
      setClauses.push(`streaming_platform = $${paramCount}`);
      values.push(streaming_platform);
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

    // Add ID for WHERE clause
    paramCount++;
    values.push(id);

    const updateQuery = `
      UPDATE matches 
      SET ${setClauses.join(", ")} 
      WHERE id = $${paramCount}
      RETURNING id
    `;

    const result = await sql(updateQuery, values);

    if (!result || result.length === 0) {
      return Response.json({ error: "Match not found" }, { status: 404 });
    }

    // If the match status changed to 'finished', update prediction correctness
    if (
      status === "finished" &&
      typeof home_score === "number" &&
      typeof away_score === "number"
    ) {
      await updatePredictionCorrectness(id, home_score, away_score);
    }

    // Fetch updated match
    const updatedMatch = await sql`
      SELECT 
        m.id, 
        m.fifa_match_id,
        m.match_date,
        m.stage,
        m.group_name,
        m.home_score,
        m.away_score,
        m.status,
        m.tv_channel,
        m.streaming_platform,
        ht.name as home_team_name,
        ht.code as home_team_code,
        ht.flag_emoji as home_team_flag,
        at.name as away_team_name,
        at.code as away_team_code,
        at.flag_emoji as away_team_flag,
        s.name as stadium_name,
        s.city as stadium_city,
        s.country as stadium_country
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN stadiums s ON m.stadium_id = s.id
      WHERE m.id = ${id}
    `;

    return Response.json({ match: updatedMatch[0] });
  } catch (error) {
    console.error("PUT /api/matches/[id] error:", error);
    return Response.json({ error: "Failed to update match" }, { status: 500 });
  }
}

// Helper function to update prediction correctness
async function updatePredictionCorrectness(
  matchId,
  actualHomeScore,
  actualAwayScore,
) {
  try {
    await sql`
      UPDATE predictions 
      SET 
        is_correct = (
          predicted_home_score = ${actualHomeScore} 
          AND predicted_away_score = ${actualAwayScore}
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE match_id = ${matchId}
    `;
  } catch (error) {
    console.error("Error updating prediction correctness:", error);
  }
}
