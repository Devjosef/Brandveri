import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import TrademarkSearch from './trademarkSearch';

class TrademarkLog extends Model {
    public id!: number;
    public trademarkId!: number;
    public userId!: string;
    public action!: string;
    public timestamp!: Date;
}

TrademarkLog.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    trademarkId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: TrademarkSearch,
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
    tableName: 'trademark_logs',
    timestamps: false,
    indexes: [
        { fields: ['trademark_id'] },
        { fields: ['user_id'] }
    ]
});

export default TrademarkLog;