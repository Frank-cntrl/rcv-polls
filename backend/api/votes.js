const express = require("express");
const router = express.Router();
const { Poll, PollOption, Ballot, BallotRank, User } = require("../database");
const { emitNewVote } = require("../socket-server");
const crypto = require("crypto");

// Generate a unique identifier for anonymous voters
const generateVoterIdentifier = (req) => {
  // Use IP address and user agent to create a unique identifier
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.get("user-agent") || "unknown";
  return crypto
    .createHash("sha256")
    .update(`${ip}-${userAgent}`)
    .digest("hex")
    .substring(0, 16);
};

// Submit a ballot (vote)
router.post("/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;
    const { rankings, voterName } = req.body;

    // Find poll
    const poll = await Poll.findOne({
      where: { shareId },
      include: [{ model: PollOption, as: "options" }],
    });

    if (!poll) {
      return res.status(404).send({ error: "Poll not found" });
    }

    if (poll.isClosed) {
      return res.status(400).send({ error: "This poll is closed" });
    }

    // For non-anonymous polls, check if user has already voted and validate name
    if (!poll.isAnonymous) {
      // Check if user is logged in
      const token = req.cookies?.token;
      let userId = null;
      
      if (token) {
        try {
          const jwt = require("jsonwebtoken");
          const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.id;
        } catch (err) {
          // Invalid token, user not logged in
        }
      }

      // Require voter name if user is not logged in
      if (!userId && !voterName?.trim()) {
        return res.status(400).send({
          error: "Your name is required for non-anonymous polls",
        });
      }

      // Check for existing vote
      if (userId) {
        const existingBallot = await Ballot.findOne({
          where: { pollId: poll.id, voterId: userId },
        });
        if (existingBallot) {
          return res.status(400).send({
            error: "You have already voted in this poll",
          });
        }
      } else {
        // For non-logged-in users, use identifier
        const voterIdentifier = generateVoterIdentifier(req);
        const existingBallot = await Ballot.findOne({
          where: { pollId: poll.id, voterIdentifier },
        });
        if (existingBallot) {
          return res.status(400).send({
            error: "You have already voted in this poll. Please log in to vote again.",
          });
        }
      }
    }

    // Validate rankings
    if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
      return res.status(400).send({
        error: "Rankings are required and must be an array",
      });
    }

    // Validate that all options are ranked and ranks are unique
    const optionIds = poll.options.map((opt) => opt.id);
    const rankedOptionIds = rankings.map((r) => r.pollOptionId);
    const ranks = rankings.map((r) => r.rank);

    // Check that all options are included
    if (rankedOptionIds.length !== optionIds.length) {
      return res.status(400).send({
        error: "All poll options must be ranked",
      });
    }

    // Check that all option IDs are valid
    const invalidOptions = rankedOptionIds.filter(
      (id) => !optionIds.includes(id)
    );
    if (invalidOptions.length > 0) {
      return res.status(400).send({
        error: "Invalid poll option IDs provided",
      });
    }

    // Check that ranks are unique and start from 1
    const uniqueRanks = [...new Set(ranks)];
    if (uniqueRanks.length !== ranks.length) {
      return res.status(400).send({
        error: "Ranks must be unique",
      });
    }

    const minRank = Math.min(...ranks);
    const maxRank = Math.max(...ranks);
    if (minRank !== 1 || maxRank !== optionIds.length) {
      return res.status(400).send({
        error: `Ranks must be consecutive starting from 1 (1 to ${optionIds.length})`,
      });
    }

    // Determine voter identity
    const token = req.cookies?.token;
    let userId = null;
    let voterIdentifier = null;

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Invalid token
      }
    }

    // For non-anonymous polls, we need to track the voter
    if (!poll.isAnonymous) {
      if (!userId) {
        voterIdentifier = generateVoterIdentifier(req);
      }
    }

    // Create ballot
    const ballot = await Ballot.create({
      pollId: poll.id,
      voterName: voterName?.trim() || null,
      voterId: userId,
      voterIdentifier: voterIdentifier,
    });

    // Create ballot ranks
    await Promise.all(
      rankings.map((ranking) =>
        BallotRank.create({
          ballotId: ballot.id,
          pollOptionId: parseInt(ranking.pollOptionId),
          rank: parseInt(ranking.rank),
        })
      )
    );

    // Get total vote count
    const voteCount = await Ballot.count({ where: { pollId: poll.id } });

    // Emit socket event for new vote
    emitNewVote(shareId, voteCount);

    res.status(201).send({
      message: "Ballot submitted successfully",
      ballotId: ballot.id,
    });
  } catch (error) {
    console.error("Error submitting ballot:", error);
    console.error("Error stack:", error.stack);
    res.status(500).send({
      error: "Failed to submit ballot",
      message: error.message,
    });
  }
});

module.exports = router;
