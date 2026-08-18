import express from "express";
import { env } from "@footballterror/config";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "footballterror-api", version: "0.1.0" });
});

app.listen(env.PORT, () => {
  console.log(`FootballTerror API running on port ${env.PORT}`);
});
