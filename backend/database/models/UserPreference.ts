import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';

class UserPreference extends Model {
  public id!: number;
  public userId!: number;
  public preferenceKey!: string;
  public preferenceValue!: string;
  public readonly createdAt!: Date;
}

UserPreference.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    preferenceKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    preferenceValue: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_preferences',
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['preference_key'] }
    ]
  }
);

export default UserPreference;