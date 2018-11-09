import * as plugins from './elasticsearch.plugins';
import { ElasticSearch } from './elasticsearch.classes.elasticsearch';
import { ILogPackage } from '@pushrocks/smartlog-interfaces';

import { Stringmap } from '@pushrocks/lik';

export class ElasticIndex {
  private stringmap = new Stringmap();
  private elasticSearchRef: ElasticSearch<any>;

  constructor(elasticSearchInstanceArg: ElasticSearch<ILogPackage>) {
    this.elasticSearchRef = elasticSearchInstanceArg;
  }

  public async ensureIndex(indexArg: string) {
    const done = plugins.smartpromise.defer();
    if(this.stringmap.checkString(indexArg)) {
      return;
    }
    this.elasticSearchRef.client.cat.indices({
      format: 'json',
      bytes: 'm'
    }, async (err, response: any[]) => {
      // console.log(response);
      const index = response.find(indexObject => {
        return indexObject.index === indexArg;
      });

      if(!index) {
        const done2 = plugins.smartpromise.defer();
        this.elasticSearchRef.client.indices.create({
          waitForActiveShards: '2',
          index: indexArg
        }, (error, response) => {
          // console.lof(response)
          done2.resolve();
        });
        await done2.promise;
      }
      this.stringmap.addString(indexArg);
      done.resolve();
    });
    await done.promise;
  }
}
