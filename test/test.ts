import { expect, tap } from '@pushrocks/tapbundle';
import { Qenv } from '@pushrocks/qenv';
import * as elasticsearch from '../ts/index';

const testQenv = new Qenv('./', './.nogit/');

let testElasticLog: elasticsearch.ElasticSearch<any>;

tap.test('first test', async () => {
  testElasticLog = new elasticsearch.ElasticSearch({
    indexPrefix: 'smartlog',
    indexRetention: 7,
    domain: testQenv.getEnvVarOnDemand('ELK_DOMAIN'),
    port: parseInt(testQenv.getEnvVarOnDemand('ELK_PORT'), 10),
    ssl: true
  });
  expect(testElasticLog).to.be.instanceOf(elasticsearch.ElasticSearch);
});

tap.test('should send a message to Elasticsearch', async () => {
  testElasticLog.log({
    timestamp: Date.now(),
    type: 'increment',
    level: 'info',
    context: {
      company: 'Lossless GmbH',
      companyunit: 'lossless.cloud',
      containerName: 'testcontainer',
      environment: 'test',
      runtime: 'node',
      zone: 'ship.zone'
    },
    message: 'hi, this is a testMessage'
  });
});

tap.start();
