import "dotenv/config";
import app from "./src/app.js";
import { connectDatabase } from "./src/config/database.js";
import logger from "./src/utils/logger.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDatabase();
    logger.info("database_connected");
    app.listen(PORT, () => {
        logger.info("server_started", {
            port: PORT,
          });
    });
  } catch (error) {
    logger.error("application_startup_failed", {
        error: error.message,
      });
    process.exit(1);
  }
};

startServer();