import express from "express";
import cors from "cors";
import routes from "./routes";

// Architecture: HTTP App Composition (middlewares + route mounting).
const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("GolMaster backend online");
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", routes);

export default app;
