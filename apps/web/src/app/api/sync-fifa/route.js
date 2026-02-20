import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Sync FIFA data (placeholder for future FIFA API integration)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // This is a placeholder implementation
    // In the future, this would integrate with the official FIFA API or scrape FIFA.com

    const syncLog = {
      timestamp: new Date().toISOString(),
      matches_updated: 0,
      scores_updated: 0,
      new_matches: 0,
      errors: [],
    };

    try {
      // Placeholder: Update some sample match scores
      // In real implementation, this would fetch from FIFA API
      const sampleUpdates = [
        {
          fifa_match_id: "WC2026_001",
          home_score: 2,
          away_score: 1,
          status: "finished",
        },
        {
          fifa_match_id: "WC2026_002",
          home_score: 0,
          away_score: 0,
          status: "live",
        },
      ];

      for (const update of sampleUpdates) {
        const result = await sql`
          UPDATE matches 
          SET 
            home_score = ${update.home_score},
            away_score = ${update.away_score},
            status = ${update.status},
            updated_at = CURRENT_TIMESTAMP
          WHERE fifa_match_id = ${update.fifa_match_id}
          RETURNING id, home_score, away_score, status
        `;

        if (result && result.length > 0) {
          syncLog.matches_updated++;
          syncLog.scores_updated++;

          // If match is finished, update prediction correctness
          if (update.status === "finished") {
            await sql`
              UPDATE predictions 
              SET 
                is_correct = (
                  predicted_home_score = ${update.home_score} 
                  AND predicted_away_score = ${update.away_score}
                ),
                updated_at = CURRENT_TIMESTAMP
              WHERE match_id = ${result[0].id}
            `;
          }
        }
      }

      // Log sync activity
      console.log("FIFA sync completed:", syncLog);

      return Response.json({
        success: true,
        message: "FIFA data sync completed successfully",
        summary: syncLog,
      });
    } catch (syncError) {
      console.error("FIFA sync error:", syncError);
      syncLog.errors.push(syncError.message);

      return Response.json(
        {
          success: false,
          message: "FIFA data sync completed with errors",
          summary: syncLog,
        },
        { status: 207 },
      ); // Multi-status
    }
  } catch (error) {
    console.error("POST /api/sync-fifa error:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to sync FIFA data",
        message: "Internal server error during FIFA sync",
      },
      { status: 500 },
    );
  }
}

// Get sync status/history (optional)
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return some basic stats about the data
    const [matchStats] = await sql.transaction([
      sql`
        SELECT 
          COUNT(*) as total_matches,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_matches,
          COUNT(CASE WHEN status = 'live' THEN 1 END) as live_matches,
          COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished_matches
        FROM matches
      `,
      sql`
        SELECT 
          COUNT(*) as total_predictions,
          COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_predictions,
          COUNT(CASE WHEN is_correct = false THEN 1 END) as incorrect_predictions,
          COUNT(CASE WHEN is_correct IS NULL THEN 1 END) as pending_predictions
        FROM predictions
      `,
    ]);

    const [predictionStats] = await sql`
      SELECT 
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_predictions,
        COUNT(CASE WHEN is_correct = false THEN 1 END) as incorrect_predictions,
        COUNT(CASE WHEN is_correct IS NULL THEN 1 END) as pending_predictions
      FROM predictions
    `;

    return Response.json({
      last_sync: new Date().toISOString(),
      matches: matchStats[0],
      predictions: predictionStats[0],
      sync_available: true,
      note: "FIFA API integration coming soon - currently using placeholder data",
    });
  } catch (error) {
    console.error("GET /api/sync-fifa error:", error);
    return Response.json(
      { error: "Failed to get sync status" },
      { status: 500 },
    );
  }
}
