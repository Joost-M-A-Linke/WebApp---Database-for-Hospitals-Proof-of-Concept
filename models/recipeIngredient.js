const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecipeIngredient = sequelize.define('RecipeIngredient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    recipeId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ingredientId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'e.g. gram, ml, cup, tbsp'
    }
  }, {
    tableName: 'recipe_ingredients',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      { fields: ['recipeId'] },
      { fields: ['ingredientId'] }
    ]
  });
  return RecipeIngredient;
};
