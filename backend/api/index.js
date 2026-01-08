const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");
const pollsRouter = require("./polls");
const votesRouter = require("./votes");
const resultsRouter = require("./results");

// Add me route under api for compatibility (redirect to auth)
router.get("/me", (req, res) => {
  res.redirect("/auth/me");
});

// Add ballot aliases for votes
router.use("/ballot", votesRouter);
router.use("/ballots", votesRouter);

router.use("/test-db", testDbRouter);
router.use("/polls", pollsRouter);
router.use("/votes", votesRouter);
router.use("/results", resultsRouter);

module.exports = router;
