import { DataTypes } from 'sequelize';
import sequelize from '../../database'; // Assuming you have a sequelize instance

const Copyright = sequelize.define('Copyright', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  registrationNumber: {
    type: DataTypes.STRING,
    unique: true,
  },
  registrationDate: {
    type: DataTypes.DATE,
  },
}, {
  timestamps: true,
});

export default Copyright;