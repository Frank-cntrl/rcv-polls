const { DataTypes } = require("sequelize");
const db = require("./db");

const Ballot = db.define("ballot", {
  pollId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "polls",
      key: "id",
    },
  },
  voterName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Ballot;
