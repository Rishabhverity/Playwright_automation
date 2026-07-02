import { Router } from "express";
import { getUserFromRequest } from "../lib/auth/session";
import {
  getDefaultPageSize,
  getSessionTtlMs,
  normalizePagination,
} from "../lib/sessionConfig";
import { deleteSession, listSessionsPaginatedForUser } from "../lib/sessionStorage";

const router = Router();

router.get("/", async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { page, pageSize } = normalizePagination(req.query.page, req.query.pageSize);

  const result = await listSessionsPaginatedForUser(user.id, page, pageSize);

  res.json({
    ...result,
    limits: {
      ttlHours: getSessionTtlMs() / (60 * 60 * 1000),
      defaultPageSize: getDefaultPageSize(),
    },
  });
});

router.delete("/:sessionId", async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const deleted = await deleteSession(req.params.sessionId, user.id);
  if (!deleted) {
    res.status(404).json({ error: "Session not found." });
    return;
  }

  res.json({ success: true });
});

export default router;
