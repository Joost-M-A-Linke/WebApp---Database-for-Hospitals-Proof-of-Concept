const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CookingStep = sequelize.define('CookingStep', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    recipeId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stepNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stepType: {
      type: DataTypes.ENUM('preparation', 'cooking'),
      allowNull: false,
      defaultValue: 'cooking'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'cooking_steps',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      { fields: ['recipeId'] }
    ]
  });
  return CookingStep;
};
