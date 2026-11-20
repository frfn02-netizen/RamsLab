import dotenv from "dotenv";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { createUserIndexes } from "./modules/users/user.index.js";
import { createAlumniIndexes } from "./modules/alumni/alumni.index.js";
import { createDosenIndexes } from "./modules/dosen/dosen.index.js";
import { createProjectIndexes } from "./modules/projects/project.index.js";
import { createPartnerIndexes } from "./modules/partners/partner.index.js";
import { createTrackingIndexes } from "./modules/tracking/tracking.respository.js";
import { createResearchAreaIndexes } from "./modules/research/research.index.js";
import { createSiteContentIndexes } from "./modules/site-content/site-content.index.js";
import { createPublicationIndexes } from "./modules/publications/publication.index.js";
import { createStudentIndexes } from "./modules/students/student.index.js";
import { createExpertIndexes } from "./modules/experts/expert.index.js";
import { createVideoIndexes } from "./modules/videos/video.index.js";
import { createMeetingIndexes } from "./modules/meetings/meeting.index.js";
import { createAuthIndexes } from "./modules/auth/auth.index.js";
import { createMeetingReminderIndexes } from "./modules/meeting-reminders/meeting-reminder.index.js";
import { createLabMembershipIndexes } from "./modules/lab-memberships/lab-membership.index.js";
import { startMeetingReminderScheduler } from "./modules/meeting-reminders/meeting-reminder.scheduler.js";
import { readMeetingReminderConfig } from "./config/meeting-reminders.js";
import {
  getEmailConfigurationDiagnostics,
  isEmailConfigured,
} from "./lib/email.js";
import { getPrimaryFrontendOrigin, isProduction } from "./config/security.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDatabase();
    await createUserIndexes();
    await createAlumniIndexes();
    await createDosenIndexes();
    await createProjectIndexes();
    await createPartnerIndexes();
    await createTrackingIndexes();
    await createResearchAreaIndexes();
    await createSiteContentIndexes();
    await createPublicationIndexes();
    await createStudentIndexes();
    await createExpertIndexes();
    await createVideoIndexes();
    await createMeetingIndexes();
    await createAuthIndexes();
    await createLabMembershipIndexes();

    const meetingReminderConfig = readMeetingReminderConfig();
    if (meetingReminderConfig.enabled) {
      await createMeetingReminderIndexes();
    }

    if (!isEmailConfigured()) {
      console.warn(
        "Password reset email delivery is not configured. Self-service reset links will not be sent.",
        getEmailConfigurationDiagnostics(),
      );
    }

    if (meetingReminderConfig.enabled && !isEmailConfigured()) {
      console.warn(
        "Meetings email reminders are enabled but email delivery is not configured.",
        getEmailConfigurationDiagnostics(),
      );
    }

    if (isProduction() && getPrimaryFrontendOrigin().startsWith("http://")) {
      console.warn(
        "FRONTEND_URL is not HTTPS in production. Password reset links may be rejected or unusable.",
        { frontendOrigin: getPrimaryFrontendOrigin() },
      );
    }

    const httpServer = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 RAMS API running on http://0.0.0.0:${PORT}`);
    });

    const reminderScheduler = startMeetingReminderScheduler({
      config: meetingReminderConfig,
    });
    let shuttingDown = false;

    const shutdown = async (signal: NodeJS.Signals) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`Received ${signal}. Shutting down.`);

      const forceExit = setTimeout(() => {
        console.error("Forced shutdown after reminder scheduler drain timeout");
        process.exit(1);
      }, 35_000);
      forceExit.unref();

      await reminderScheduler.stop(30_000);
      httpServer.close((error) => {
        clearTimeout(forceExit);
        if (error) {
          console.error("HTTP server shutdown failed", {
            error: error.message,
          });
          process.exit(1);
        }
        process.exit(0);
      });
    };

    process.once("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
    process.once("SIGINT", () => {
      void shutdown("SIGINT");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);

    process.exit(1);
  }
}

startServer();
