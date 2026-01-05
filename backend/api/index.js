const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");
const pollsRouter = require("./polls");
const votesRouter = require("./votes");
const resultsRouter = require("./results");

router.use("/test-db", testDbRouter);
router.use("/polls", pollsRouter);
router.use("/votes", votesRouter);
router.use("/results", resultsRouter);

module.exports = router;
