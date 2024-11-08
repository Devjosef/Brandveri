import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';
import { RecommendationMetadata } from '../../types/metadata';

interface RecommendationAttributes {
  id: string;
  user_id: string;
  recommendation_type: 'trademark' | 'copyright' | 'patent' | 'general';
  name: string;
  description?: string;
  priority?: number;
  status?: string;
  metadata?: RecommendationMetadata;
  readonly created_at: Date;
  readonly updated_at: Date;
}
class Recommendation extends Model<RecommendationAttributes> implements RecommendationAttributes {
  public id!: string;
  public user_id!: string;
  public recommendation_type!: 'trademark' | 'copyright' | 'patent' | 'general';
  public name!: string;
  public description?: string;
  public priority?: number;
  public status?: string;
  public metadata?: RecommendationMetadata;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Recommendation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    recommendation_type: {
      type: DataTypes.ENUM('trademark', 'copyright', 'patent', 'general'),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priority: {
      type: DataTypes.SMALLINT,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'recommendations',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['recommendation_type'] },
      { fields: ['status'] },
      { fields: ['priority'] },
      { using: 'gin', fields: ['metadata'] }
    ]
  }
);

export default Recommendation;