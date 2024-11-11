import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';
import { CopyrightMetadata } from '../../types/metadata';
import CopyrightLog from './copyrightLogs';

interface CopyrightAttributes {
  id: string;
  user_id: string;
  title: string;
  author: string;
  registration_number: string;
  registration_date?: Date;
  status: 'pending' | 'registered' | 'rejected' | 'expired' | 'abandoned';
  country: string;
  work_type?: string;
  publication_date?: Date;
  creation_date?: Date;
  metadata?: CopyrightMetadata;
  readonly created_at: Date;
  readonly updated_at: Date;
}

class Copyright extends Model<CopyrightAttributes> implements CopyrightAttributes {
  public id!: string;
  public user_id!: string;
  public title!: string;
  public author!: string;
  public registration_number!: string;
  public registration_date?: Date;
  public status!: 'pending' | 'registered' | 'rejected' | 'expired' | 'abandoned';
  public country!: string;
  public work_type?: string;
  public publication_date?: Date;
  public creation_date?: Date;
  public metadata?: CopyrightMetadata;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  
  public static associate(): void {
    Copyright.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });

    Copyright.hasMany(CopyrightLog, {
      foreignKey: 'copyright_id',
      as: 'logs',
      onDelete: 'CASCADE'
    });
  }
}

Copyright.init(
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    registration_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    registration_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'registered', 'rejected', 'expired', 'abandoned'),
      defaultValue: 'pending',
    },
    country: {
      type: DataTypes.STRING(3),
      defaultValue: 'USA',
    },
    work_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    publication_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    creation_date: {
      type: DataTypes.DATE,
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
    tableName: 'copyrights',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['registration_number'] },
      { fields: ['author'] },
      { fields: ['title'] },
      { fields: ['status'] },
      { fields: ['country'] },
      { using: 'gin', fields: ['metadata'] }
    ]
  }
);

export default Copyright;
