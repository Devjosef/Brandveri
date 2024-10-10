import { DataTypes, Model } from 'sequelize';
import sequelize from '../config'; // Adjust the path to your actual config file

class RecommendationLog extends Model {
  public id!: number;
  public recommendationId!: number;
  public userId!: string;
  public action!: string;
  public timestamp!: Date;
}

RecommendationLog.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  recommendationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Recommendations', // Reference Recommendations table
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  tableName: 'RecommendationLogs',
  timestamps: false,
});

export default RecommendationLog;
