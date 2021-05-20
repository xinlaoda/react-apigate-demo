import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { EventEmitter } from 'events';
import transcribeConstants from '../constants/transcribe.constants';
import logger from '../utils/logger';


class TranscribeController extends EventEmitter {

  private transcribeConfig?: typeof transcribeConstants;

  private started: boolean;

  private s3Client?: S3Client;

  private lambdaClient?: LambdaClient;

  constructor() {
    super();
    this.started = false;
  }

  hasConfig() {
    return !!this.transcribeConfig;
  }

  setConfig(transcribeConfig: typeof transcribeConstants) {
    this.transcribeConfig = transcribeConfig;
  }

  validateConfig() {
    if (
      !this.transcribeConfig?.accessKey ||
      !this.transcribeConfig.secretAccessKey
    ) {
      throw new Error(
        'missing required config: access key and secret access key are required',
      );
    }
  }

  
  async invokeSentimentAPI(text: string) {
    logger.info('translate started ...', text);
    
    if (!this.transcribeConfig) {
      throw new Error('translate config is not set');
    }

    // setup TranslateClient
    // creating and setting up transcribe client
    const config = {
        region: this.transcribeConfig.region,
        credentials: {
            accessKeyId: this.transcribeConfig.accessKey,
            secretAccessKey: this.transcribeConfig.secretAccessKey,
        },
    };
    logger.info('setting up s3 client with config', config);
    this.s3Client = new S3Client(config);
    this.lambdaClient = new LambdaClient(config);

    const fileKey = new Date().getTime().toString();
    const fullKey = `${fileKey}/${fileKey}.txt`;
    const bucketName = 'sentiment-test';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fullKey,
      Body: text,
      ContentType: 'text/plain',
    });

    const result = await this.s3Client.send(command);
    logger.info('get result: ', result);
    if (
        result.$metadata.httpStatusCode === 200
    ) {
        await this.invokeSpotAPI(bucketName, fileKey);
    } else {
        logger.error('Failed to save text to S3, return code: ', result.$metadata.httpStatusCode);
    }    

  }

  invokeSpotAPI = (bucket: String, key: String) => {
    const body = JSON.stringify({
            's3_bucket': bucket, 
            's3_path': key,
            'bot_name':'sentiment-analysis-bot', 
            'number_of_bots':'1',
            'bulk_size':'500', 
            'output_s3_bucket':bucket,
            'output_s3_prefix': key,

    });
    const apipayload = JSON.stringify({
        'httpMethod': 'POST',
        'body':  body,

    });
    const utf8payload = new Uint8Array(apipayload.length);
    for (let i=0; i < apipayload.length; i++) {
        utf8payload[i] = apipayload.charCodeAt(i);
    }

    logger.info('payload: ', apipayload);
       // invoke lambda
    const invokeParams = new InvokeCommand({
      FunctionName: 'sam_spot_bot_api_receiver',
      Payload: utf8payload,
    });
    const response = this.lambdaClient?.send(invokeParams).then(
        (error) => {
            if (error.$metadata.httpStatusCode !== 200) {
              logger.error('Failed to call lambda, ', error );
            }
            
        },
    );    
    
    // check result in S3
    const getObjCommand = new GetObjectCommand({
      Bucket: bucket as string,
      Key: `${key}/${key}.json`,
    });
    this.getResult(getObjCommand);
  };


  getResult = (getObjCommand: GetObjectCommand) => {
      let resultText = '';
      setTimeout(() => {
        logger.info('check result');
        if (this.s3Client) {
          const s3result = this.s3Client.send(getObjCommand).then(
              (data) => {
                if (data.Body) {                  
                  const reader = (data.Body as ReadableStream).getReader();
                  let result='';
                  const  processResult = () => {                      
                      return reader.read().then(({ done, value }) => {
                        logger.info('done: ', done);
                        logger.info('result: ', result);
                        if (done) {
                            // resultText = result;
                            const resultTextJson = JSON.parse(result);
                            for (const [key, v] of Object.entries(resultTextJson)) {
                                resultText += `分析文件：${key}, 分析结果： ${v} \n`;
                            }
                            logger.info(resultTextJson);
                            logger.info('resultText: ', resultText);
                            this.emit('result', resultText);
                            return;
                        }
                        for (let i=0; i< value.length; i++) {
                            result += String.fromCharCode(value[i]);
                            logger.info('value: ', value[i], '    result:  ', result);
                        }
                        // result += value;
                        processResult();
                      });
                  };
                  processResult();

                }
              },
              (error) => {
                  this.getResult(getObjCommand);
              },
          );
          
        }
        
      }, 10000);
  };

}

export default TranscribeController;
