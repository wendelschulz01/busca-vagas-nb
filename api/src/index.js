import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRouter from "./routes/health.js";
import ingestRouter from "./routes/ingest.js";
import searchRouter from "./routes/search.js";
import searchNbRouter from "./routes/search_nb.js"; 

// cron
import { scheduleDailyIngest } from "./cron/ingestDaily.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));

app.use("/health", healthRouter);
app.use("/ingest", ingestRouter);
app.use("/search", searchRouter);
app.use("/search-nb", searchNbRouter); 

scheduleDailyIngest();

const PORT = Number(process.env.API_PORT || process.env.PORT || 4000);
app.listen(PORT, () => console.log(`API on http://0.0.0.0:${PORT}`));
