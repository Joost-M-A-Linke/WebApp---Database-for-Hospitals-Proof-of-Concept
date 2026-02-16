const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    displayName: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('normal','editor','admin'), allowNull: false, defaultValue: 'normal' },
    lastLogin: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'users'
  });
  return User;
};
