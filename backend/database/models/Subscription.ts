import { Model, DataTypes } from 'sequelize';
import sequelize from '../config';
import User from './User';

interface SubscriptionAttributes {
  id: string;
  user_id: string;
  subscription_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'pending' | 'expired' | 'suspended';
  start_date: Date;
  end_date?: Date;
  billing_cycle?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  readonly created_at: Date;
  readonly updated_at: Date;
}

class Subscription extends Model<SubscriptionAttributes> implements SubscriptionAttributes {
  public id!: string;
  public user_id!: string;
  public subscription_id!: string;
  public plan_id!: string;
  public status!: 'active' | 'cancelled' | 'pending' | 'expired' | 'suspended';
  public start_date!: Date;
  public end_date?: Date;
  public billing_cycle?: string;
  public amount?: number;
  public currency?: string;
  public metadata?: Record<string, unknown>;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Subscription.init(
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
    subscription_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    plan_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'cancelled', 'pending', 'expired', 'suspended'),
      allowNull: false,
      defaultValue: 'pending',
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    billing_cycle: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
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
    tableName: 'subscriptions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['subscription_id'] },
      { fields: ['plan_id'] },
      { fields: ['status'] },
      { fields: ['start_date', 'end_date'] },
      { using: 'gin', fields: ['metadata'] }
    ]
  }
);

export default Subscription;