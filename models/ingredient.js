const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ingredient = sequelize.define('Ingredient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'ingredients',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      { fields: ['name'] }
    ]
  });
  return Ingredient;
};
