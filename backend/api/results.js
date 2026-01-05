const express = require("express");
const router = express.Router();
const { Poll, PollOption, Ballot, BallotRank } = require("../database");
const { authenticateJWT } = require("../auth");

// Instant Runoff Voting Algorithm
function calculateIRVResults(ballots, options) {
  const optionIds = options.map((opt) => opt.id);
  const results = {
    rounds: [],
    winner: null,
    eliminated: [],
  };

  let activeOptions = [...optionIds];
  let round = 1;
  const maxRounds = optionIds.length;

  while (round <= maxRounds && activeOptions.length > 1) {
    // Count first-choice votes for each active option
    const voteCounts = {};
    activeOptions.forEach((optId) => {
      voteCounts[optId] = 0;
    });

    ballots.forEach((ballot) => {
      // Find the highest-ranked active option for this ballot
      const activeRanks = ballot.ranks
        .filter((r) => activeOptions.includes(r.pollOptionId))
        .sort((a, b) => a.rank - b.rank);

      if (activeRanks.length > 0) {
        const firstChoice = activeRanks[0].pollOptionId;
        voteCounts[firstChoice]++;
      }
    });

    // Calculate percentages
    const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
    const percentages = {};
    activeOptions.forEach((optId) => {
      percentages[optId] =
        totalVotes > 0 ? (voteCounts[optId] / totalVotes) * 100 : 0;
    });

    // Check for majority winner (50%+)
    const sortedOptions = activeOptions.sort(
      (a, b) => voteCounts[b] - voteCounts[a]
    );
    const topOption = sortedOptions[0];
    const topVotes = voteCounts[topOption];

    const roundResult = {
      round,
      voteCounts: { ...voteCounts },
      percentages: { ...percentages },
      eliminated: null,
    };

    if (topVotes > totalVotes / 2) {
      // Winner found!
      roundResult.winner = topOption;
      results.rounds.push(roundResult);
      results.winner = topOption;
      break;
    }

    // Eliminate the option with the fewest votes
    const sortedByVotes = activeOptions.sort(
      (a, b) => voteCounts[a] - voteCounts[b]
    );
    const eliminatedOption = sortedByVotes[0];

    // Handle ties - if multiple options have the same lowest count, eliminate all
    const lowestCount = voteCounts[eliminatedOption];
    const toEliminate = activeOptions.filter(
      (optId) => voteCounts[optId] === lowestCount
    );

    toEliminate.forEach((optId) => {
      results.eliminated.push(optId);
      activeOptions = activeOptions.filter((id) => id !== optId);
    });

    roundResult.eliminated = toEliminate;
    results.rounds.push(roundResult);

    round++;
  }

  // If only one option remains, it's the winner
  if (activeOptions.length === 1) {
    results.winner = activeOptions[0];
  }

  return results;
}

// Get poll results (only creator can view before poll is closed)
router.get("/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;

    const poll = await Poll.findOne({
      where: { shareId },
      include: [
        { model: PollOption, as: "options", order: [["order", "ASC"]] },
      ],
    });

    if (!poll) {
      return res.status(404).send({ error: "Poll not found" });
    }

    // Check if poll is closed or if user is the creator
    const token = req.cookies?.token;
    let isCreator = false;
    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
        const decoded = jwt.verify(token, JWT_SECRET);
        isCreator = decoded.id === poll.creatorId;
      } catch (err) {
        // Invalid token, not creator
      }
    }

    if (!poll.isClosed && !isCreator) {
      return res.status(403).send({
        error: "Poll results are only available after the poll is closed",
      });
    }

    // Get all ballots with their ranks
    const ballots = await Ballot.findAll({
      where: { pollId: poll.id },
      include: [
        {
          model: BallotRank,
          as: "ranks",
          include: [{ model: PollOption, as: "pollOption" }],
        },
      ],
    });

    if (ballots.length === 0) {
      return res.send({
        poll,
        results: {
          totalBallots: 0,
          rounds: [],
          winner: null,
          message: "No votes have been cast yet",
        },
      });
    }

    // Calculate IRV results
    const irvResults = calculateIRVResults(ballots, poll.options);

    // Format results with option details
    const formattedResults = {
      totalBallots: ballots.length,
      rounds: irvResults.rounds.map((round) => ({
        round: round.round,
        voteCounts: poll.options.reduce((acc, opt) => {
          acc[opt.id] = {
            optionId: opt.id,
            optionText: opt.text,
            votes: round.voteCounts[opt.id] || 0,
            percentage: round.percentages[opt.id] || 0,
          };
          return acc;
        }, {}),
        eliminated: round.eliminated
          ? poll.options
              .filter((opt) => round.eliminated.includes(opt.id))
              .map((opt) => ({ id: opt.id, text: opt.text }))
          : null,
        winner: round.winner
          ? poll.options.find((opt) => opt.id === round.winner)
          : null,
      })),
      winner: irvResults.winner
        ? poll.options.find((opt) => opt.id === irvResults.winner)
        : null,
      eliminated: irvResults.eliminated.map((optId) =>
        poll.options.find((opt) => opt.id === optId)
      ),
    };

    res.send({
      poll,
      results: formattedResults,
    });
  } catch (error) {
    console.error("Error calculating results:", error);
    res.sendStatus(500);
  }
});

module.exports = router;
