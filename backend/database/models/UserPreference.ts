import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';

class UserPreference extends Model {
  public id!: string;
  public user_id!: string;
  public preference_key!: string;
  public preference_value!: string;
  public preference_category?: 'theme' | 'notification' | 'privacy' | 'display';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserPreference.init(
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
    preference_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    preference_value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    preference_category: {
      type: DataTypes.ENUM('theme', 'notification', 'privacy', 'display'),
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
    tableName: 'user_preferences',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['preference_key'] },
      { fields: ['preference_category'] },
      { unique: true, fields: ['user_id', 'preference_key'] }
    ]
  }
);

export default UserPreference;