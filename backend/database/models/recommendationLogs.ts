import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import Recommendation from './recommendation';
import User from './User';

interface RecommendationLogAttributes {
  id: string;
  recommendation_id: string;
  user_id: string;
  action: 'create' | 'view' | 'update' | 'delete' | 'implement' | 'dismiss';
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  readonly created_at: Date;
}

class RecommendationLog extends Model<RecommendationLogAttributes> implements RecommendationLogAttributes {
  public id!: string;
  public recommendation_id!: string;
  public user_id!: string;
  public action!: 'create' | 'view' | 'update' | 'delete' | 'implement' | 'dismiss';
  public details?: Record<string, unknown>;
  public ip_address?: string;
  public user_agent?: string;
  public readonly created_at!: Date;

  public static associate(): void {
    RecommendationLog.belongsTo(Recommendation, {
      foreignKey: 'recommendation_id',
      as: 'recommendation',
      onDelete: 'CASCADE'
    });

    RecommendationLog.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });
  }
}

RecommendationLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recommendation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Recommendation,
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    action: {
      type: DataTypes.ENUM('create', 'view', 'update', 'delete', 'implement', 'dismiss'),
      allowNull: false,
    },
    details: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    sequelize,
    tableName: 'recommendation_logs',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['recommendation_id'] },
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
      { using: 'gin', fields: ['details'] }
    ]
  }
);

export default RecommendationLog;
