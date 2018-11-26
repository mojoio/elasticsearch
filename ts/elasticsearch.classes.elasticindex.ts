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
      done.resolve();
      return;
    }
    this.elasticSearchRef.client.cat.indices(
      {
        format: 'json',
        bytes: 'm'
      },
      async (err, responseArg: any[]) => {
        if(err) {
          console.log(err);
          return;
        }

        // lets delete indexes that violate the retention
        if(Array.isArray(responseArg)) {
          const filteredIndices = responseArg.filter(indexObjectArg => {
            return indexObjectArg.index.startsWith('smartlog');
          });
          const filteredIndexNames = filteredIndices.map(indexObjectArg => {
            return indexObjectArg.index;
          });
          this.deleteOldIndices(filteredIndexNames);
        }

        let index = null;
        
        if(Array.isArray(responseArg)) {
          index = responseArg.find(indexObject => {
            return indexObject.index === indexArg;
          });
        }

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

  public createNewIndex(indexNameArg: string) {

  }

  public async deleteOldIndices(indicesArray: string[]) {
    const todayAsUnix: number = Date.now();
        const rententionPeriodAsUnix: number = plugins.smarttime.units.days(
          this.elasticSearchRef.indexRetention
        );
    for (const indexName of indicesArray) {
      const regexResult = /^smartlog-([0-9]*)\.([0-9]*)\.([0-9]*)$/.exec(indexName);
      const dateAsUnix: number = new Date(
        `${regexResult[1]}-${regexResult[2]}-${regexResult[3]}`
      ).getTime();
      if (todayAsUnix - rententionPeriodAsUnix > dateAsUnix) {
        console.log(`found old index ${indexName}`);
        const done2 = plugins.smartpromise.defer();
        this.elasticSearchRef.client.indices.delete(
          {
            index: indexName
          },
          (err2, response2) => {
            if (err2) {
              console.log(err2);
            }
            console.log(`deleted ${indexName}`);
            done2.resolve();
          }
        );
        await done2.promise;
      }
    }
  }
}
