const { DataTypes } = require("sequelize");
const db = require("./db");

const Poll = db.define("poll", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  shareId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  isClosed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isAnonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Poll;
