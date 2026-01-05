const express = require("express");
const router = express.Router();
const { Poll, PollOption, Ballot, BallotRank } = require("../database");
const { emitNewVote } = require("../socket-server");

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

    // Create ballot
    const ballot = await Ballot.create({
      pollId: poll.id,
      voterName: voterName?.trim() || null,
    });

    // Create ballot ranks
    await Promise.all(
      rankings.map((ranking) =>
        BallotRank.create({
          ballotId: ballot.id,
          pollOptionId: ranking.pollOptionId,
          rank: ranking.rank,
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
    res.sendStatus(500);
  }
});

module.exports = router;
