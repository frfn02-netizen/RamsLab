import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const meetingService = vi.hoisted(() => ({
  addAttachment: vi.fn(),
  cancelMeeting: vi.fn(),
  checkConflicts: vi.fn(),
  createMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  getMeetingAgenda: vi.fn(),
  getMeeting: vi.fn(),
  getMeetingCalendar: vi.fn(),
  getMeetings: vi.fn(),
  removeAttachment: vi.fn(),
  updateMeeting: vi.fn(),
}));

vi.mock("../src/modules/meetings/meeting.service.js", () => meetingService);

import { getMeetingAgendaController } from "../src/modules/meetings/meeting.controller.js";
import { HttpError } from "../src/middlewares/error.middleware.js";

const app = express();
app.get(
  "/api/meetings/agenda",
  (req, _res, next) => {
    req.user = {
      userId: "00000000000000000000a002",
      role: "DOSEN",
      tokenVersion: 0,
    };
    next();
  },
  getMeetingAgendaController,
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("meeting agenda API contract", () => {
  it("preserves an authorization error code on a 403 response", async () => {
    meetingService.getMeetingAgenda.mockRejectedValue(
      new HttpError(
        403,
        "The shared agenda is available to RAMS accounts",
        undefined,
        "AGENDA_ACCESS_DENIED",
      ),
    );

    const response = await request(app).get("/api/meetings/agenda");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "The shared agenda is available to RAMS accounts",
      code: "AGENDA_ACCESS_DENIED",
    });
  });

  it("keeps the existing response shape for errors without a code", async () => {
    meetingService.getMeetingAgenda.mockRejectedValue(
      new HttpError(400, "Invalid date range"),
    );

    const response = await request(app).get("/api/meetings/agenda");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid date range",
    });
  });
});
