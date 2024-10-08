import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config'; // 

// interface representing the attributes of the CopyrightSearch model
interface CopyrightSearchAttributes {
  id: number;
  title: string;
  author: string;
  registration_number: string;
  registration_date: Date;
  status: string;
  country: string;
  created_at?: Date;
  updated_at?: Date;
}

// creation attributes interface (id is optional)
interface CopyrightSearchCreationAttributes extends Optional<CopyrightSearchAttributes, 'id'> {}

// CopyrightSearch model class extending Sequelize's Model
class CopyrightSearch extends Model<CopyrightSearchAttributes, CopyrightSearchCreationAttributes> 
  implements CopyrightSearchAttributes {
  public id!: number;
  public title!: string;
  public author!: string;
  public registration_number!: string;
  public registration_date!: Date;
  public status!: string;
  public country!: string;
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// Initialize the model
CopyrightSearch.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    registration_number: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    registration_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize, // Pass the Sequelize instance
    tableName: 'copyrights', // Table name in PostgreSQL
    timestamps: true, // Automatically manage createdAt and updatedAt fields
    underscored: true, // Use snake_case columns in the database
  }
);


export default CopyrightSearch;
