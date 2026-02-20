import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get all matches
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit")) || 50;
    const offset = parseInt(searchParams.get("offset")) || 0;

    let query = `
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
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 0;

    if (stage) {
      paramCount++;
      query += ` AND m.stage = $${paramCount}`;
      values.push(stage);
    }

    if (status) {
      paramCount++;
      query += ` AND m.status = $${paramCount}`;
      values.push(status);
    }

    query += ` ORDER BY m.match_date ASC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const matches = await sql(query, values);

    return Response.json({
      matches: matches || [],
      total: matches?.length || 0,
    });
  } catch (error) {
    console.error("GET /api/matches error:", error);
    return Response.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}

// Create new match (admin only - for now just authenticated users)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      fifa_match_id,
      home_team_code,
      away_team_code,
      stadium_id,
      match_date,
      stage,
      group_name,
      tv_channel,
      streaming_platform,
    } = body;

    if (!home_team_code || !away_team_code || !match_date || !stage) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get team IDs from codes
    const teams = await sql`
      SELECT id, code FROM teams 
      WHERE code IN (${home_team_code}, ${away_team_code})
    `;

    const homeTeam = teams.find((t) => t.code === home_team_code);
    const awayTeam = teams.find((t) => t.code === away_team_code);

    if (!homeTeam || !awayTeam) {
      return Response.json({ error: "Invalid team codes" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO matches (
        fifa_match_id, home_team_id, away_team_id, stadium_id, 
        match_date, stage, group_name, tv_channel, streaming_platform
      ) VALUES (
        ${fifa_match_id}, ${homeTeam.id}, ${awayTeam.id}, ${stadium_id || null},
        ${match_date}, ${stage}, ${group_name || null}, ${tv_channel || null}, ${streaming_platform || null}
      ) RETURNING id
    `;

    const matchId = result[0].id;

    // Fetch the created match with full details
    const newMatch = await sql`
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
      WHERE m.id = ${matchId}
    `;

    return Response.json({ match: newMatch[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/matches error:", error);
    return Response.json({ error: "Failed to create match" }, { status: 500 });
  }
}
