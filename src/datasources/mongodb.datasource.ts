import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

const config = {
  name: 'mongodb',
  connector: 'mongodb',
  url: 'mongodb://elecciones_user:r0RkCZbPzbEncYrs@ac-hqwvso3-shard-00-00.cy5l1y5.mongodb.net:27017,ac-hqwvso3-shard-00-01.cy5l1y5.mongodb.net:27017,ac-hqwvso3-shard-00-02.cy5l1y5.mongodb.net:27017/seguridadElecciones_bd?ssl=true&replicaSet=atlas-8xlslm-shard-0&authSource=admin&retryWrites=true&w=majority',
  host: 'localhost',
  port: 27017,
  user: 'elecciones_user',
  password: 'r0RkCZbPzbEncYrs',
  database: 'seguridadElecciones_bd',
  useNewUrlParser: true
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class MongodbDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'mongodb';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.mongodb', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
