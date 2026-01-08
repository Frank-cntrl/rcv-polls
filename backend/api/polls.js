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

// Get all polls (public or user-specific based on auth and query params)
router.get("/", async (req, res) => {
  try {
    const { type } = req.query; // 'all' for all public polls, default for user polls
    
    const token = req.cookies?.token;
    let userId = null;
    
    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Invalid token, continue without user ID
      }
    }
    
    if (type === "all") {
      // Return all public polls (non-anonymous or all polls for now)
      const polls = await Poll.findAll({
        include: [
          { model: PollOption, as: "options", order: [["order", "ASC"]] },
          { model: User, as: "creator", attributes: ["id", "username"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 50, // Limit to prevent overwhelming response
      });
      
      return res.send({ polls });
    }
    
    // Default behavior: return user's polls if authenticated
    if (userId) {
      const polls = await Poll.findAll({
        where: { creatorId: userId },
        include: [
          { model: PollOption, as: "options", order: [["order", "ASC"]] },
          { model: User, as: "creator", attributes: ["id", "username"] },
        ],
        order: [["createdAt", "DESC"]],
      });
      
      return res.send({ polls });
    }
    
    // Return empty array for unauthenticated users
    res.send({ polls: [] });
  } catch (error) {
    console.error("Error fetching polls:", error);
    res.sendStatus(500);
  }
});

// Create a new poll
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { title, description, options, isAnonymous } = req.body;

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
      isAnonymous: isAnonymous !== undefined ? isAnonymous : true,
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

// Get voter list for non-anonymous polls (creator only)
router.get("/:id/voters", authenticateJWT, async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: { id: req.params.id, creatorId: req.user.id },
    });

    if (!poll) {
      return res.status(404).send({ error: "Poll not found" });
    }

    if (poll.isAnonymous) {
      return res.status(400).send({
        error: "Voter list is not available for anonymous polls",
      });
    }

    // Get all ballots with voter information
    const ballots = await Ballot.findAll({
      where: { pollId: poll.id },
      include: [
        {
          model: User,
          as: "voter",
          attributes: ["id", "username", "email"],
          required: false,
        },
      ],
      order: [["submittedAt", "DESC"]],
    });

    // Format voter list
    const voters = ballots.map((ballot) => ({
      id: ballot.id,
      voterName: ballot.voterName,
      username: ballot.voter?.username || null,
      email: ballot.voter?.email || null,
      isLoggedIn: !!ballot.voterId,
      submittedAt: ballot.submittedAt,
    }));

    res.send({ voters, totalVotes: voters.length });
  } catch (error) {
    console.error("Error fetching voters:", error);
    res.sendStatus(500);
  }
});

module.exports = router;
