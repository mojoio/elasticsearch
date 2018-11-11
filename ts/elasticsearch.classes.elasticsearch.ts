// interfaces
import { Client as ElasticClient } from 'elasticsearch';
import { ILogContext, ILogPackage, ILogDestination } from '@pushrocks/smartlog-interfaces';

// other classes
import { ElasticScheduler } from './elasticsearch.classes.elasticscheduler';
import { ElasticIndex } from './elasticsearch.classes.elasticindex';

export interface IStandardLogParams {
  message: string;
  severity: string;
}

export interface IElasticSearchConstructorOptions {
  indexPrefix: string;
  indexRetention: number;
  port: number;
  domain: string;
  ssl: boolean;
  user?: string;
  pass?: string;
}

export class ElasticSearch<T> {
  public client: ElasticClient;
  public elasticScheduler = new ElasticScheduler(this);
  public elasticIndex: ElasticIndex = new ElasticIndex(this);

  public indexPrefix: string;
  public indexRetention: number;

  /**
   * sets up an instance of Elastic log
   * @param optionsArg
   */
  constructor(optionsArg: IElasticSearchConstructorOptions) {
    this.client = new ElasticClient({
      host: this.computeHostString(optionsArg),
      // log: 'trace'
    });
    this.indexPrefix = optionsArg.indexPrefix;
    this.indexRetention = optionsArg.indexRetention;
  }

  /**
   * computes the host string from the constructor options
   * @param optionsArg
   */
  private computeHostString(optionsArg: IElasticSearchConstructorOptions): string {
    let hostString = `${optionsArg.domain}:${optionsArg.port}`;
    if (optionsArg.user && optionsArg.pass) {
      hostString = `${optionsArg.user}:${optionsArg.pass}@${hostString}`;
    }
    if (optionsArg.ssl) {
      hostString = `https://${hostString}`;
    } else {
      hostString = `http://${hostString}`;
    }
    return hostString;
  }

  public async log(logPackageArg: ILogPackage, scheduleOverwrite = false) {
    const now = new Date();
    const indexToUse = `${this.indexPrefix}-${now.getFullYear()}.${('0' + (now.getMonth() + 1)).slice(-2)}.${(
      '0' + now.getDate()
    ).slice(-2)}`;


    if (this.elasticScheduler.docsScheduled && !scheduleOverwrite) {
      this.elasticScheduler.scheduleDoc(logPackageArg);
      return;
    }

    await this.elasticIndex.ensureIndex(indexToUse);

    this.client.index(
      {
        index: indexToUse,
        type: 'log',
        body: {
          '@timestamp': new Date(logPackageArg.timestamp).toISOString(),
          ...logPackageArg
        }
      },
      (error, response) => {
        if (error) {
          console.log('ElasticLog encountered an error:');
          console.log(error);
          this.elasticScheduler.addFailedDoc(logPackageArg);
        } else {
          // console.log(`ElasticLog: ${logPackageArg.message}`);
        }
      }
    );
  }

  get logDestination (): ILogDestination {
    return {
      handleLog: (smartlogPackageArg: ILogPackage) => {
        this.log(smartlogPackageArg);
      }
    }
  }
}
