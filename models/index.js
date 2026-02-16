const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME || 'lsmd_db', process.env.DB_USER || 'root', process.env.DB_PASS || '', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  dialect: 'mysql',
  logging: false,
});

const User = require('./user')(sequelize);
const Patient = require('./patient')(sequelize);
const Document = require('./document')(sequelize);
const Log = require('./log')(sequelize);

User.hasMany(Patient, { foreignKey: 'createdBy', sourceKey: 'id' });
Patient.belongsTo(User, { foreignKey: 'createdBy', targetKey: 'id', as: 'creator' });

User.hasMany(Patient, { foreignKey: 'lastSeenBy', sourceKey: 'id' });
Patient.belongsTo(User, { foreignKey: 'lastSeenBy', targetKey: 'id', as: 'lastSeenByUser' });

Patient.hasMany(Document, { foreignKey: 'patientId' });
Document.belongsTo(Patient, { foreignKey: 'patientId' });

User.hasMany(Document, { foreignKey: 'createdBy' });
Document.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Log, { foreignKey: 'userId' });
Log.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, Patient, Document, Log };
