import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get user's friends
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "accepted";

    const friends = await sql`
      SELECT 
        f.id as friendship_id,
        f.status,
        f.created_at,
        u.id as user_id,
        u.name,
        u.email,
        u.image,
        -- Calculate friend's prediction stats
        COUNT(p.id) as total_predictions,
        COUNT(CASE WHEN p.is_correct = true THEN 1 END) as correct_predictions,
        CASE 
          WHEN COUNT(p.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN p.is_correct = true THEN 1 END)::float / COUNT(p.id)::float * 100), 2)
          ELSE 0 
        END as success_rate
      FROM friendships f
      JOIN auth_users u ON (
        CASE 
          WHEN f.user_id = ${session.user.id} THEN u.id = f.friend_user_id
          ELSE u.id = f.user_id
        END
      )
      LEFT JOIN predictions p ON p.user_id = u.id
      WHERE (f.user_id = ${session.user.id} OR f.friend_user_id = ${session.user.id})
        AND f.status = ${status}
      GROUP BY f.id, f.status, f.created_at, u.id, u.name, u.email, u.image
      ORDER BY f.created_at DESC
    `;

    return Response.json({
      friends: friends || [],
      total: friends?.length || 0,
    });
  } catch (error) {
    console.error("GET /api/friends error:", error);
    return Response.json({ error: "Failed to fetch friends" }, { status: 500 });
  }
}

// Send friend request
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { friend_email } = body;

    if (!friend_email || typeof friend_email !== "string") {
      return Response.json(
        { error: "Friend email is required" },
        { status: 400 },
      );
    }

    // Find the user by email
    const users = await sql`
      SELECT id, name, email, image 
      FROM auth_users 
      WHERE LOWER(email) = LOWER(${friend_email})
    `;

    if (!users || users.length === 0) {
      return Response.json(
        { error: "User not found with that email" },
        { status: 404 },
      );
    }

    const friend = users[0];

    if (friend.id === session.user.id) {
      return Response.json(
        { error: "Cannot add yourself as a friend" },
        { status: 400 },
      );
    }

    // Check if friendship already exists
    const existingFriendships = await sql`
      SELECT id, status 
      FROM friendships 
      WHERE (
        (user_id = ${session.user.id} AND friend_user_id = ${friend.id})
        OR (user_id = ${friend.id} AND friend_user_id = ${session.user.id})
      )
    `;

    if (existingFriendships && existingFriendships.length > 0) {
      const existing = existingFriendships[0];
      if (existing.status === "accepted") {
        return Response.json(
          { error: "Already friends with this user" },
          { status: 400 },
        );
      } else if (existing.status === "pending") {
        return Response.json(
          { error: "Friend request already sent" },
          { status: 400 },
        );
      }
    }

    // Create friendship (friend request)
    const result = await sql`
      INSERT INTO friendships (user_id, friend_user_id, status)
      VALUES (${session.user.id}, ${friend.id}, 'pending')
      RETURNING id, status, created_at
    `;

    return Response.json(
      {
        message: "Friend request sent successfully",
        friendship: {
          id: result[0].id,
          status: result[0].status,
          created_at: result[0].created_at,
          friend: {
            id: friend.id,
            name: friend.name,
            email: friend.email,
            image: friend.image,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/friends error:", error);
    return Response.json(
      { error: "Failed to send friend request" },
      { status: 500 },
    );
  }
}
