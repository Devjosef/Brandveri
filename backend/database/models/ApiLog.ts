import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';

class ApiLog extends Model {
  public id!: number;
  public endpoint!: string;
  public requestMethod!: string;
  public statusCode!: number;
  public readonly createdAt!: Date;
}

ApiLog.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    requestMethod: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'api_logs',
    indexes: [
      {
        fields: ['endpoint', 'requestMethod'],
      },
    ],
  }
);

export default ApiLog;