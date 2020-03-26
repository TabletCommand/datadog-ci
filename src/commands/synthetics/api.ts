import { Options } from 'request';
import { defaults as requestDefaults, RequestPromise } from 'request-promise-native';

import {
  APIConstructor,
  Payload,
  PollResult,
  Test,
  Trigger,
} from './interfaces';

const formatBackendErrors = (requestError: any) => {
  try {
    const backendErrors = requestError.error.errors;

    return backendErrors.map((message: string) => `  - ${message}`).join('\n');
  } catch (e) {
    return requestError.name;
  }
};

const triggerTests = (request: (args: Options) => RequestPromise<Trigger>) =>
  async (testIds: string[], config?: Payload) => {
    try {
      const resp = await request({
        body: {
          config,
          public_ids: testIds,
        },
        method: 'POST',
        uri: '/synthetics/tests/trigger/ci',
      });

      return resp;
    } catch (e) {
      let errorMessage = e.name;
      if (e.statusCode === 400) {
        errorMessage = `\n${formatBackendErrors(e)}`;
      }
      // Rewrite the error.
      throw new Error(`Could not trigger [${testIds}]. ${e.statusCode}: ${errorMessage}`);
    }
  };

const getTest = (request: (args: Options) => RequestPromise<Test>) => async (testId: string) => {
  try {
    const resp = await request({
      uri: `/synthetics/tests/${testId}`,
    });

    return resp;
  } catch (e) {
    // Rewrite the error.
    throw new Error(`Could not get test ${testId}. ${e.statusCode}: ${e.name}`);
  }
};

const pollResults = (request: (args: Options) => RequestPromise<{ results: PollResult[] }>) =>
  async (resultIds: string[]) => {
    try {
      const resp = await request({
        qs: {
          result_ids: JSON.stringify(resultIds),
        },
        uri: '/synthetics/tests/poll_results',
      });

      return resp;
    } catch (e) {
      // Rewrite the error.
      throw new Error(`Could not poll results [${resultIds}]. ${e.statusCode}: ${e.name}`);
    }
  };

export const apiConstructor: APIConstructor = ({ appKey, apiKey, baseUrl }) => {
  const request = (args: Options) =>
    requestDefaults({
        baseUrl,
        json: true,
      })({
        ...args,
        qs: { api_key: apiKey, application_key: appKey, ...args.qs },
      });

  return {
    getTest: getTest(request),
    pollResults: pollResults(request),
    triggerTests: triggerTests(request),
  };
};
