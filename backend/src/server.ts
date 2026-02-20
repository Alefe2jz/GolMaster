import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// rota raiz
app.get("/", (req, res) => {
  return res.send("GolMaster backend online");
});

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/api/health", (req, res) => res.json({ ok: true }));

// API
app.use("/api", routes);

const port = Number(process.env.PORT || 3333);
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

