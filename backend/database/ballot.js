const { DataTypes } = require("sequelize");
const db = require("./db");

const Ballot = db.define("ballot", {
  pollId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  voterName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  voterId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "users",
      key: "id",
    },
  },
  voterIdentifier: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Unique identifier for anonymous voters (e.g., IP hash, session ID)",
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Ballot;
