import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { AuthController } from "../controllers/AuthController";
import { auth } from "../middlewares/auth";
import { MatchesController } from "../controllers/MatchesController";
import { PredictionsController } from "../controllers/PredictionsController";
import { FriendsController } from "../controllers/FriendsController";
import { SettingsController } from "../controllers/SettingsController";
import { SyncController } from "../controllers/SyncController";

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

export default router;
