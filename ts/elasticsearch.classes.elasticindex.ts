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
    if (this.stringmap.checkString(indexArg)) {
      return;
    }
    this.elasticSearchRef.client.cat.indices(
      {
        format: 'json',
        bytes: 'm'
      },
      async (err, response: any[]) => {
        // lets delete indexes that violate the retention
        const filteredIndices = response.filter(indexObjectArg => {
          return indexObjectArg.index.startsWith('smartlog');
        });
        const filteredIndexNames = filteredIndices.map(indexObjectArg => {
          return indexObjectArg.name;
        });
        const todayAsUnix: number = Date.now();
        const rententionPeriodAsUnix: number = plugins.smarttime.units.days(
          this.elasticSearchRef.indexRetention
        );
        for (const indexName of filteredIndexNames) {
          const regexResult = /^smartlog-([0-9]*)\.([0-9]*)\.([0-9]*)$/;
          const dateAsUnix: number = new Date(
            `${regexResult[1]}-${regexResult[2]}-${regexResult[3]}`
          ).getTime();
          if (todayAsUnix - rententionPeriodAsUnix > dateAsUnix) {
            const done2 = plugins.smartpromise.defer();
            this.elasticSearchRef.client.indices.delete({
              index: indexName
            }, (err2, response2) => {
              if(err2) {
                console.log(err2);
              }
              done.resolve();
            });
            await done2.promise;
          }
        }

        // console.log(response);
        const index = response.find(indexObject => {
          return indexObject.index === indexArg;
        });

        if (!index) {
          const done2 = plugins.smartpromise.defer();
          this.elasticSearchRef.client.indices.create(
            {
              waitForActiveShards: '2',
              index: indexArg
            },
            (error, response) => {
              // console.lof(response)
              done2.resolve();
            }
          );
          await done2.promise;
        }
        this.stringmap.addString(indexArg);
        done.resolve();
      }
    );
    await done.promise;
  }
}
