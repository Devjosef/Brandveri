import { DataTypes, Model } from 'sequelize';
import sequelize from '../config'; 

class Recommendation extends Model {
  public id!: number;
  public userId!: string;
  public recommendationType!: string;
  public name!: string;
  public description?: string;
  public createdAt!: Date;
}

Recommendation.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  recommendationType: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  tableName: 'Recommendations',
  timestamps: false, 
});

export default Recommendation;