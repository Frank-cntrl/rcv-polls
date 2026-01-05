const express = require("express");
const router = express.Router();
const { Poll, PollOption, Ballot, BallotRank, User } = require("../database");
const { authenticateJWT } = require("../auth");
const { emitPollClosed } = require("../socket-server");
const crypto = require("crypto");

// Generate unique share ID
const generateShareId = () => {
  return crypto.randomBytes(8).toString("hex");
};

// Create a new poll
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { title, description, options } = req.body;

    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).send({
        error: "Poll must have a title and at least 2 options",
      });
    }

    // Validate options
    const validOptions = options.filter(
      (opt) => opt && typeof opt === "string" && opt.trim().length > 0
    );
    if (validOptions.length < 2) {
      return res.status(400).send({
        error: "Poll must have at least 2 valid options",
      });
    }

    // Generate unique share ID
    let shareId = generateShareId();
    while (await Poll.findOne({ where: { shareId } })) {
      shareId = generateShareId();
    }

    // Create poll
    const poll = await Poll.create({
      title: title.trim(),
      description: description?.trim() || null,
      shareId,
      creatorId: req.user.id,
    });

    // Create poll options
    const pollOptions = await Promise.all(
      validOptions.map((text, index) =>
        PollOption.create({
          text: text.trim(),
          pollId: poll.id,
          order: index,
        })
      )
    );

    const pollWithOptions = await Poll.findByPk(poll.id, {
      include: [
        { model: PollOption, as: "options", order: [["order", "ASC"]] },
        { model: User, as: "creator", attributes: ["id", "username"] },
      ],
    });

    res.status(201).send({ poll: pollWithOptions });
  } catch (error) {
    console.error("Error creating poll:", error);
    res.sendStatus(500);
  }
});

// Get all polls created by the authenticated user
router.get("/my-polls", authenticateJWT, async (req, res) => {
  try {
    const polls = await Poll.findAll({
      where: { creatorId: req.user.id },
      include: [
        { model: PollOption, as: "options", order: [["order", "ASC"]] },
        { model: User, as: "creator", attributes: ["id", "username"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.send({ polls });
  } catch (error) {
    console.error("Error fetching polls:", error);
    res.sendStatus(500);
  }
});

// Get a poll by share ID (public endpoint, no auth required)
router.get("/share/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;

    const poll = await Poll.findOne({
      where: { shareId },
      include: [
        { model: PollOption, as: "options", order: [["order", "ASC"]] },
        { model: User, as: "creator", attributes: ["id", "username"] },
      ],
    });

    if (!poll) {
      return res.status(404).send({ error: "Poll not found" });
    }

    // Get vote count
    const voteCount = await Ballot.count({ where: { pollId: poll.id } });

    res.send({ poll, voteCount });
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.sendStatus(500);
  }
});

// Get a poll by ID (for creator)
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: { id: req.params.id, creatorId: req.user.id },
      include: [
        { model: PollOption, as: "options", order: [["order", "ASC"]] },
        { model: User, as: "creator", attributes: ["id", "username"] },
      ],
    });

    if (!poll) {
      return res.status(404).send({ error: "Poll not found" });
    }

    res.send({ poll });
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.sendStatus(500);
  }
});

// Close a poll (only creator can close)
router.post("/:id/close", authenticateJWT, async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: { id: req.params.id, creatorId: req.user.id },
    });

    if (!poll) {
      return res.status(404).send({ error: "Poll not found" });
    }

    if (poll.isClosed) {
      return res.status(400).send({ error: "Poll is already closed" });
    }

    poll.isClosed = true;
    await poll.save();

    // Emit socket event for poll closed
    emitPollClosed(poll.shareId);

    res.send({ poll });
  } catch (error) {
    console.error("Error closing poll:", error);
    res.sendStatus(500);
  }
});

module.exports = router;
