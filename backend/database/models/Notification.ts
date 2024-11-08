import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';

interface NotificationAttributes {
  id: string;
  user_id: string;
  type: 'system' | 'trademark' | 'payment' | 'subscription' | 'security';
  title: string;
  message: string;
  read_status: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
  expires_at?: Date;
  readonly created_at: Date;
  readonly updated_at: Date;
}

class Notification extends Model<NotificationAttributes> implements NotificationAttributes {
  public id!: string;
  public user_id!: string;
  public type!: 'system' | 'trademark' | 'payment' | 'subscription' | 'security';
  public title!: string;
  public message!: string;
  public read_status!: boolean;
  public priority?: number;
  public metadata?: Record<string, unknown>;
  public expires_at?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Notification.init(
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
    type: {
      type: DataTypes.ENUM('system', 'trademark', 'payment', 'subscription', 'security'),
      allowNull: false,
      defaultValue: 'system',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    read_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.SMALLINT,
      defaultValue: 0,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'notifications',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['type'] },
      { fields: ['read_status'] },
      { fields: ['priority'] },
      { fields: ['created_at'] },
      { fields: ['expires_at'] },
      { using: 'gin', fields: ['metadata'] }
    ]
  }
);

export default Notification;