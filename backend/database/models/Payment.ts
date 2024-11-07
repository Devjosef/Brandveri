import { Model, DataTypes } from 'sequelize';
import sequelize from '../config';
import User from './User';
import Subscription from './Subscription';

class Payment extends Model {
  public id!: string;
  public user_id!: string;
  public subscription_id?: string;
  public stripe_payment_id!: string;
  public amount!: number;
  public currency!: string;
  public status!: 'pending' | 'success' | 'failed' | 'refunded' | 'disputed';
  public payment_method?: string;
  public billing_details?: object;
  public metadata?: object;
  public refund_reason?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Payment.init(
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
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Subscription,
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    stripe_payment_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed', 'refunded', 'disputed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    billing_details: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    refund_reason: {
      type: DataTypes.TEXT,
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
    tableName: 'payments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['subscription_id'] },
      { fields: ['stripe_payment_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
      { using: 'gin', fields: ['metadata'] },
      { using: 'gin', fields: ['billing_details'] }
    ]
  }
);

export default Payment;
