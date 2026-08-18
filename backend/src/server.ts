import dotenv from "dotenv";
import app from "./app.js";
import { connectDatabase, } from "./config/database.js";
import { createUserIndexes, } from "./modules/users/user.index.js";
import { createAlumniIndexes, } from "./modules/alumni/alumni.index.js";
import { createDosenIndexes, } from "./modules/dosen/dosen.index.js";
import { createProjectIndexes, } from "./modules/projects/project.index.js";
import { createPartnerIndexes, } from "./modules/partners/partner.index.js";
import { createTrackingIndexes, } from "./modules/tracking/tracking.respository.js";
import { createResearchAreaIndexes } from "./modules/research/research.index.js";
import { createSiteContentIndexes } from "./modules/site-content/site-content.index.js";

dotenv.config();

const PORT =
  process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase()
    await createUserIndexes();
    await createAlumniIndexes();
    await createDosenIndexes();
    await createProjectIndexes();
    await createPartnerIndexes();
    await createTrackingIndexes();
    await createResearchAreaIndexes();
    await createSiteContentIndexes();

    app.listen(PORT, () => {
      console.log(
        `🚀 RAMS API running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "❌ Failed to start server:",
      error
    );

    process.exit(1);
  }
}


startServer();
