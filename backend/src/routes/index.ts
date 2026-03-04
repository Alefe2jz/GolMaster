import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { AuthController } from "../controllers/AuthController";
import { auth } from "../middlewares/auth";
import { MatchesController } from "../controllers/MatchesController";
import { PredictionsController } from "../controllers/PredictionsController";
import { FriendsController } from "../controllers/FriendsController";
import { SettingsController } from "../controllers/SettingsController";
import { SyncController } from "../controllers/SyncController";
import { authAdmin } from "../middlewares/authAdmin";
import { AdminAuthController } from "../controllers/AdminAuthController";
import { AdminUsersController } from "../controllers/AdminUsersController";
import { AdminGamesController } from "../controllers/AdminGamesController";
import { AdminNotificationsController } from "../controllers/AdminNotificationsController";
import { AdminSettingsController } from "../controllers/AdminSettingsController";

// Architecture: API route map (HTTP endpoint -> controller entrypoint).
const router = Router();

// health
router.get("/health", (req, res) => res.json({ ok: true }));

// auth
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/auth/google", AuthController.googleLogin);

// users
router.get("/users", auth, UserController.index);
router.delete("/users/me", auth, UserController.removeMe);

// matches
router.get("/matches", MatchesController.index);
router.get("/matches/:id", MatchesController.show);
router.post("/matches", auth, MatchesController.create);

// predictions
router.get("/predictions", auth, PredictionsController.index);
router.post("/predictions", auth, PredictionsController.upsert);
router.delete("/predictions/:matchId", auth, PredictionsController.remove);

// friends
router.get("/friends", auth, FriendsController.index);
router.post("/friends", auth, FriendsController.create);
router.put("/friends/:id", auth, FriendsController.respond);
router.delete("/friends/:id", auth, FriendsController.remove);

// user settings
router.get("/user-settings", auth, SettingsController.show);
router.put("/user-settings", auth, SettingsController.update);

// sync fifa
router.post("/sync-fifa", auth, SyncController.sync);
router.get("/sync-fifa", auth, SyncController.stats);

// admin auth
router.post("/admin/auth/login", AdminAuthController.login);

// admin users
router.get("/admin/users", authAdmin, AdminUsersController.index);
router.patch("/admin/users/:id/block", authAdmin, AdminUsersController.block);
router.patch("/admin/users/:id/role", authAdmin, AdminUsersController.role);

// admin games
router.get("/admin/games", authAdmin, AdminGamesController.index);
router.patch("/admin/games/:id/score", authAdmin, AdminGamesController.updateScore);
router.patch("/admin/games/:id", authAdmin, AdminGamesController.update);

// admin notifications
router.post(
  "/admin/notifications",
  authAdmin,
  AdminNotificationsController.create
);
router.get("/admin/notifications", authAdmin, AdminNotificationsController.index);

// admin settings
router.get("/admin/settings", authAdmin, AdminSettingsController.show);
router.put("/admin/settings", authAdmin, AdminSettingsController.update);

export default router;
