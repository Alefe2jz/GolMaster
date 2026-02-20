import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Accept or decline friend request
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { action } = body; // 'accept' or 'decline'

    if (!action || !["accept", "decline"].includes(action)) {
      return Response.json(
        { error: 'Invalid action. Use "accept" or "decline"' },
        { status: 400 },
      );
    }

    // Check if friendship exists and user has permission to modify it
    const friendships = await sql`
      SELECT id, user_id, friend_user_id, status
      FROM friendships 
      WHERE id = ${id}
        AND (user_id = ${session.user.id} OR friend_user_id = ${session.user.id})
        AND status = 'pending'
    `;

    if (!friendships || friendships.length === 0) {
      return Response.json(
        { error: "Friend request not found or already processed" },
        { status: 404 },
      );
    }

    const friendship = friendships[0];

    // Only the friend who received the request can accept/decline
    if (friendship.friend_user_id !== session.user.id) {
      return Response.json(
        { error: "You can only respond to friend requests sent to you" },
        { status: 403 },
      );
    }

    let newStatus;
    if (action === "accept") {
      newStatus = "accepted";
    } else {
      // For decline, we can either delete the record or set status to 'declined'
      // Let's delete it to keep the table clean
      await sql`DELETE FROM friendships WHERE id = ${id}`;
      return Response.json({ message: "Friend request declined" });
    }

    // Update friendship status
    const result = await sql`
      UPDATE friendships 
      SET status = ${newStatus}
      WHERE id = ${id}
      RETURNING id, user_id, friend_user_id, status, created_at
    `;

    // Get friend info
    const friendInfo = await sql`
      SELECT id, name, email, image 
      FROM auth_users 
      WHERE id = ${friendship.user_id}
    `;

    return Response.json({
      message: `Friend request ${action}ed successfully`,
      friendship: {
        id: result[0].id,
        status: result[0].status,
        created_at: result[0].created_at,
        friend: friendInfo[0],
      },
    });
  } catch (error) {
    console.error("PUT /api/friends/[id] error:", error);
    return Response.json(
      { error: "Failed to update friend request" },
      { status: 500 },
    );
  }
}

// Remove friend
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Check if friendship exists and user has permission to delete it
    const result = await sql`
      DELETE FROM friendships 
      WHERE id = ${id}
        AND (user_id = ${session.user.id} OR friend_user_id = ${session.user.id})
      RETURNING id
    `;

    if (!result || result.length === 0) {
      return Response.json({ error: "Friendship not found" }, { status: 404 });
    }

    return Response.json({ message: "Friendship removed successfully" });
  } catch (error) {
    console.error("DELETE /api/friends/[id] error:", error);
    return Response.json(
      { error: "Failed to remove friendship" },
      { status: 500 },
    );
  }
}
