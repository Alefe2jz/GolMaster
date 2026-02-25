import express from "express";
import cors from "cors";
import routes from "./routes";

// Architecture: HTTP App Composition (middlewares + route mounting).
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("GolMaster backend online");
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", routes);

export default app;
