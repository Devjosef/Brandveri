import { Model, DataTypes } from 'sequelize';
import sequelize from '../config';
import User from './User';
import Subscription from './Subscription';
import Invoice from './Invoice';

interface PaymentAttributes {
  id: string;
  user_id: string;
  subscription_id?: string;
  stripe_payment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded' | 'disputed';
  payment_method?: string;
  billing_details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  refund_reason?: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

class Payment extends Model<PaymentAttributes> implements PaymentAttributes {
  public id!: string;
  public user_id!: string;
  public subscription_id?: string;
  public stripe_payment_id!: string;
  public amount!: number;
  public currency!: string;
  public status!: 'pending' | 'success' | 'failed' | 'refunded' | 'disputed';
  public payment_method?: string;
  public billing_details?: Record<string, unknown>;
  public metadata?: Record<string, unknown>;
  public refund_reason?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public static associate(): void {
    Payment.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });

    Payment.belongsTo(Subscription, {
      foreignKey: 'subscription_id',
      as: 'subscription',
      onDelete: 'SET NULL'
    });

    Payment.belongsTo(Invoice, {
      foreignKey: 'invoice_id',
      as: 'invoice',
      onDelete: 'SET NULL'
    });
  }
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
