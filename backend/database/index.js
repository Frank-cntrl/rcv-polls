const db = require("./db");
const User = require("./user");
const Poll = require("./poll");
const PollOption = require("./pollOption");
const Ballot = require("./ballot");
const BallotRank = require("./ballotRank");

// Define associations
User.hasMany(Poll, { foreignKey: "creatorId", as: "polls" });
Poll.belongsTo(User, { foreignKey: "creatorId", as: "creator" });

Poll.hasMany(PollOption, { foreignKey: "pollId", as: "options" });
PollOption.belongsTo(Poll, { foreignKey: "pollId", as: "poll" });

Poll.hasMany(Ballot, { foreignKey: "pollId", as: "ballots" });
Ballot.belongsTo(Poll, { foreignKey: "pollId", as: "poll" });

Ballot.hasMany(BallotRank, { foreignKey: "ballotId", as: "ranks" });
BallotRank.belongsTo(Ballot, { foreignKey: "ballotId", as: "ballot" });

PollOption.hasMany(BallotRank, { foreignKey: "pollOptionId", as: "ballotRanks" });
BallotRank.belongsTo(PollOption, { foreignKey: "pollOptionId", as: "pollOption" });

module.exports = {
  db,
  User,
  Poll,
  PollOption,
  Ballot,
  BallotRank,
};
