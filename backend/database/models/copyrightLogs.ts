import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import CopyrightSearch from './copyrightSearch';

class CopyrightLog extends Model {
  public id!: number;
  public copyrightId!: number;
  public userId!: string;
  public action!: string;
  public timestamp!: Date;
}

CopyrightLog.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  copyrightId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CopyrightSearch,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  tableName: 'copyright_logs',
  timestamps: false,
  indexes: [
    { fields: ['copyright_id'] },
    { fields: ['user_id'] }
  ]
});

export default CopyrightLog;