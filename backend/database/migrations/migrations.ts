import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from '../config'; // Adjust the path if necessary

const umzug = new Umzug({
  migrations: {
    glob: 'migrations/*.ts', // Adjust the path to your migrations folder
  },
  storage: new SequelizeStorage({ sequelize }),
  context: sequelize.getQueryInterface(),
  logger: console,
});

export const up = async () => {
  await umzug.up();
};

export const down = async () => {
  await umzug.down();
};

if (require.main === module) {
  up().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
