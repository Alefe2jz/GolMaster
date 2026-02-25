import "dotenv/config";
import app from "./app";

// Architecture: process bootstrap (env + network listener only).
const port = Number(process.env.PORT || 3333);
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

