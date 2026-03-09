const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prepTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Preparation time in minutes'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'recipes',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      { fields: ['createdBy'] },
      { fields: ['name'] }
    ]
  });
  return Recipe;
};
