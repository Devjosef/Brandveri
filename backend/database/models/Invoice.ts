import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';
import Subscription from './Subscription';

interface InvoiceAttributes {
  id: string;
  user_id: string;
  subscription_id?: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: Date;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  payment_terms?: string;
  billing_details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  notes?: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

class Invoice extends Model<InvoiceAttributes> implements InvoiceAttributes {
  public id!: string;
  public user_id!: string;
  public subscription_id?: string;
  public invoice_number!: string;
  public amount!: number;
  public currency!: string;
  public due_date!: Date;
  public status!: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  public payment_terms?: string;
  public billing_details?: Record<string, unknown>;
  public metadata?: Record<string, unknown>;
  public notes?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public static associate(): void {
    Invoice.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });

    Invoice.belongsTo(Subscription, {
      foreignKey: 'subscription_id',
      as: 'subscription',
      onDelete: 'SET NULL'
    });
  }
}

Invoice.init(
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
    invoice_number: {
      type: DataTypes.STRING(50),
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
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'draft',
    },
    payment_terms: {
      type: DataTypes.TEXT,
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
    notes: {
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
    tableName: 'invoices',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['subscription_id'] },
      { fields: ['status'] },
      { fields: ['due_date'] },
      { fields: ['created_at'] },
      { using: 'gin', fields: ['metadata'] },
      { using: 'gin', fields: ['billing_details'] }
    ]
  }
);

export default Invoice;