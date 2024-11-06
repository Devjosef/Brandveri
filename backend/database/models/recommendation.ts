import { DataTypes, Model } from 'sequelize';
import sequelize from '../config'; 

class Recommendation extends Model {
  public id!: number;
  public user_id!: string;
  public recommendation_type!: string;
  public name!: string;
  public description?: string;
  public created_at!: Date;
}

Recommendation.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  recommendation_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'recommendation_type'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, 
{
  sequelize,
  tableName: 'recommendations',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['recommendation_type'] },
    { fields: ['created_at'] }
  ]
}
);

export default Recommendation;