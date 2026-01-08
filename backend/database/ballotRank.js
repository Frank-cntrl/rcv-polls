const { DataTypes } = require("sequelize");
const db = require("./db");

const BallotRank = db.define("ballotRank", {
  ballotId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pollOptionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
  },
});

module.exports = BallotRank;
