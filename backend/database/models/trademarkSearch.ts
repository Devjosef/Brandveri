import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';
import User from './user'; // Fixed casing issue


class TrademarkSearch extends Model {
  public id!: number;
  public userId!: number;
  public searchTerm!: string;
  public searchDate!: Date;
  public results!: object;
}

TrademarkSearch.init(
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
    searchTerm: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    searchDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    results: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'trademark_searches',
  }
);

export default TrademarkSearch;