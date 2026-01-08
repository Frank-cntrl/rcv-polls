const { DataTypes } = require("sequelize");
const db = require("./db");

const PollOption = db.define("pollOption", {
  text: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200],
    },
  },
  pollId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

module.exports = PollOption;
