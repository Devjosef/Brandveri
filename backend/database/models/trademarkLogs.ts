import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import TrademarkSearch from './trademarkSearch';
import User from './User';

interface TrademarkLogAttributes {
  id: string;
  trademark_id: string;
  user_id: string;
  action: 'search' | 'view' | 'export' | 'update' | 'delete';
  details?: Record<string, unknown>;
  nice_classes?: number[];
  class_descriptions?: Record<string, string>;
  ip_address?: string;
  user_agent?: string;
  readonly created_at: Date;
}

class TrademarkLog extends Model<TrademarkLogAttributes> implements TrademarkLogAttributes {
  public id!: string;
  public trademark_id!: string;
  public user_id!: string;
  public action!: 'search' | 'view' | 'export' | 'update' | 'delete';
  public details?: Record<string, unknown>;
  public nice_classes?: number[];
  public class_descriptions?: Record<string, string>;
  public ip_address?: string;
  public user_agent?: string;
  public readonly created_at!: Date;

  public static associate(): void {
    TrademarkLog.belongsTo(TrademarkSearch, {
      foreignKey: 'trademark_id',
      as: 'trademark',
      onDelete: 'CASCADE'
    });

    TrademarkLog.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });
  }
}

TrademarkLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    trademark_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: TrademarkSearch,
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
      type: DataTypes.ENUM('search', 'view', 'export', 'update', 'delete'),
      allowNull: false,
    },
    details: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    nice_classes: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
      defaultValue: [],
    },
    class_descriptions: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    tableName: 'trademark_logs',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['trademark_id'] },
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
      { using: 'gin', fields: ['details'] },
      { using: 'gin', fields: ['nice_classes'] },
      { using: 'gin', fields: ['class_descriptions'] }
    ]
  }
);

export default TrademarkLog;