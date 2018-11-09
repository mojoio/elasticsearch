import { ElasticSearch, IStandardLogParams } from './elasticsearch.classes.elasticsearch';

export class ElasticScheduler {
  elasticSearchRef: ElasticSearch<any>;
  docsScheduled = false;
  docsStorage: any[] = [];

  constructor(elasticLogRefArg: ElasticSearch<any>) {
    this.elasticSearchRef = elasticLogRefArg;
  }

  public addFailedDoc(objectArg: any | IStandardLogParams) {
    this.docsStorage.push(objectArg);
    this.setRetry();
  }
  public scheduleDoc(logObject: any) {
    this.docsStorage.push(logObject);
  }

  public setRetry() {
    setTimeout(() => {
      const oldStorage = this.docsStorage;
      this.docsStorage = [];
      for (let logObject of oldStorage) {
        this.elasticSearchRef.log(logObject, true);
      }
      if (this.docsStorage.length === 0) {
        console.log('ElasticLog retry success!!!');
        this.docsScheduled = false;
      } else {
        console.log('ElasticLog retry failed');
        this.setRetry();
      }
    }, 5000);
  }

  public deferSend() {
    if (!this.docsScheduled) {
      console.log('Retry ElasticLog in 5 seconds!');
      this.docsScheduled = true;
      this.setRetry();
    }
  }
}
