import { Model, DataTypes } from 'sequelize';
import sequelize from '../config';

class Subscription extends Model {
  public id!: number;
  public user_id!: number;
  public subscription_id!: string;
  public plan_id!: string;
  public status!: string;
  public start_date!: Date;
  public end_date!: Date;
  public created_at!: Date;
  public updated_at!: Date;
}

Subscription.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  subscription_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  plan_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'pending'),
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
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['subscription_id'] },
    { fields: ['status'] },
    { fields: ['start_date'] },
    { fields: ['end_date'] }
  ]
});

export default Subscription;