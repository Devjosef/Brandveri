import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';

interface TrademarkSearchAttributes {
  id: string;
  user_id: string;
  search_term: string;
  search_date: Date;
  results: Record<string, unknown>;
  status: 'pending' | 'completed' | 'failed';
  jurisdiction?: string;
  search_type?: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}
class TrademarkSearch extends Model<TrademarkSearchAttributes> implements TrademarkSearchAttributes {
  public id!: string;
  public user_id!: string;
  public search_term!: string;
  public search_date!: Date;
  public results!: Record<string, unknown>;
  public status!: 'pending' | 'completed' | 'failed';
  public jurisdiction?: string;
  public search_type?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TrademarkSearch.init(
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
    search_term: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    search_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    results: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    jurisdiction: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    search_type: {
      type: DataTypes.STRING(50),
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
    tableName: 'trademark_searches',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['search_term'] },
      { fields: ['search_date'] },
      { fields: ['status'] },
      { fields: ['jurisdiction'] },
      { using: 'gin', fields: ['results'] }
    ]
  }
);

export default TrademarkSearch;