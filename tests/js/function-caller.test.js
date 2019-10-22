const FUNCTION_CALLER_SCRIPT_PATH = process.env.AIRFLOW_HOME + '/dags/js/function-caller.js';
const CALLABLE_SCRIPT_PATH = process.env.AIRFLOW_HOME + '/tests/js/test-callable.js';

const AWSMock = require('aws-sdk-mock');
const AWS = require('aws-sdk');
const functionCaller = require(FUNCTION_CALLER_SCRIPT_PATH);


// original definitions to be mocked
let AWSS3UploadOriginal = AWS.S3.upload;
let consoleLogOriginal = console.log;


// mock test callable
jest.mock(CALLABLE_SCRIPT_PATH);
// get mock object for assertions
const callable = require(CALLABLE_SCRIPT_PATH);


describe('Test functionCaller', () => {

  beforeEach(() => {
    process.argv = [
      '/usr/bin/node',
      FUNCTION_CALLER_SCRIPT_PATH,
      CALLABLE_SCRIPT_PATH
    ];

    process.env = {
      AIRFLOW_CTX_DAG_ID: 'dag_1',
      AIRFLOW_CTX_TASK_ID: 'task_1',
      AIRFLOW_CTX_DAG_RUN_ID: 'dag_run_1',
      COMPLETED_TASKS_BUCKET: 'completed-tasks-bucket',
      FILE_NAME: 'test-file.xml'
    };
  });

  afterEach(() => {
    AWS.S3.upload = AWSS3UploadOriginal;
    AWSMock.restore("S3");
    callable.mockClear();
    console.log = consoleLogOriginal;
  });

  test('can import and call callable from script', async () => {
    expect.assertions(1);
    await functionCaller();
    expect(callable.mock.calls.length).toBe(1);
  });


  test('will get an object from AWS S3 using passed Key', async () => {

    process.argv = process.argv.concat(['MyKey']);
    process.env.ENDPOINT_URL = 'http://s3:9000';

    // AWS mocks
    AWSMock.mock("S3", "getObject", {Body: Buffer.from('test', 'binary')});

    expect.assertions(2);
    await functionCaller();
    expect(callable.mock.calls.length).toBe(1);
    expect(callable.mock.calls[0][0].toString()).toBe('test');
  });


  test('will call callable without any arguments if AWS S3 Key is not passed', async () => {
    expect.assertions(2);
    await functionCaller();
    expect(callable.mock.calls.length).toBe(1);
    expect(callable.mock.calls[0][0]).toBe(undefined);
  });


  test('will upload returned object from callable to AWS S3', async () => {

    let s3Key = process.env.AIRFLOW_CTX_DAG_ID + "/" +
                process.env.AIRFLOW_CTX_TASK_ID + "/" +
                process.env.AIRFLOW_CTX_DAG_RUN_ID + "/" +
                process.env.FILE_NAME;

    AWSMock.mock("S3", "upload", {Key: s3Key});
    callable.mockReturnValue(Buffer.from('test'));
    console.log = jest.fn();

    expect.assertions(2);
    await functionCaller();
    expect(console.log.mock.calls.length).toBe(7);
    expect(console.log.mock.calls[6][0]).toBe(s3Key);
  });


  test('throws error if returned object from callable is not of type Buffer', async () => {

    callable.mockReturnValue(42);

    expect.assertions(1);

    try {
      await functionCaller();
    } catch (error){
      expect(error).toBe("return value from /airflow/tests/js/test-callable.js is not of type Buffer");
    }
  });


  test('will not return AWS S3 Key if return value from callable not supplied', async () => {

    AWS.S3.upload = jest.fn();
    callable.mockReturnValue(undefined);

    expect.assertions(2);
    await functionCaller();
    expect(callable.mock.calls.length).toBe(1);
    expect(AWS.S3.upload.mock.calls.length).toBe(0);
  });

});