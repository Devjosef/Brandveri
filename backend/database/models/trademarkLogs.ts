import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import TrademarkSearch from './trademarkSearch';
import User from './User';

class TrademarkLog extends Model {
  public id!: string;
  public trademark_id!: string;
  public user_id!: string;
  public action!: 'search' | 'view' | 'export' | 'update' | 'delete';
  public details?: object;
  public ip_address?: string;
  public user_agent?: string;
  public readonly created_at!: Date;
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
      { using: 'gin', fields: ['details'] }
    ]
  }
);

export default TrademarkLog;