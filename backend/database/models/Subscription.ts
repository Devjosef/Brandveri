import { Model, DataTypes } from 'sequelize';
import sequelize from '../config';


class Subscription extends Model {
  public id!: number;
  public userId!: number;
  public planId!: string;
  public stripeSubscriptionId!: string;
  public status!: string;
  public renewalDate!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Subscription.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  planId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'pending'),
    allowNull: false,
    defaultValue: 'pending',
  },
  renewalDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Subscription',
  tableName: 'subscriptions',
});

export default Subscription;