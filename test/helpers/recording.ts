import {
  mutations,
  Recording,
  RecordingEntry,
  setupRecording,
  SetupRecordingInput,
} from '@jupiterone/integration-sdk-testing';
import { isJson } from '../../src/utils/isJson';
import { IntegrationConfig } from '../../src/types';

export { Recording };

export const azureMutations = {
  ...mutations,
  mutateAccessToken,
};

export function setupAzureRecording(input: SetupRecordingInput): Recording {
  return setupRecording({
    mutateEntry: mutateRecordingEntry,
    ...input,
  });
}

function mutateRecordingEntry(entry: RecordingEntry): void {
  azureMutations.unzipGzippedRecordingEntry(entry);
  azureMutations.mutateAccessToken(entry, () => '[REDACTED]');
}

function mutateAccessToken(
  entry: RecordingEntry,
  mutation: (accessToken: string) => string,
) {
  const responseText = entry.response.content.text;
  if (!responseText) {
    return;
  }

  if (isJson(responseText)) {
    const responseJson = JSON.parse(responseText);

    if (/login/.exec(entry.request.url) && entry.request.postData) {
      // Redact request body with secrets for authentication
      entry.request.postData.text = '[REDACTED]';

      // Redact authentication response token
      if (responseJson.access_token) {
        entry.response.content.text = JSON.stringify(
          {
            ...responseJson,
            access_token: mutation(responseJson.access_token),
          },
          null,
          0,
        );
      }
    }
  }
}

type MatchRequestsBy = Required<
  SetupRecordingInput
>['options']['matchRequestsBy'];

export function getMatchRequestsBy({
  config,
  shouldReplaceSubscriptionId = defaultShouldReplaceSubscriptionId,
  options,
}: {
  config: IntegrationConfig;
  shouldReplaceSubscriptionId?: (pathname: string) => boolean;
  options?: MatchRequestsBy;
}): MatchRequestsBy {
  return {
    headers: false,
    url: {
      pathname: (pathname: string): string => {
        pathname = pathname.replace(config.directoryId, 'directory-id');
        if (shouldReplaceSubscriptionId(pathname)) {
          pathname = pathname.replace(
            config.subscriptionId || 'subscription-id',
            'subscription-id',
          );
        }
        return pathname;
      },
    },
    ...options,
  };
}

export function defaultShouldReplaceSubscriptionId(pathname: string): boolean {
  if (pathname.startsWith('//subscriptions')) {
    // Paths that start with `//subscriptions` are an indication that an _exact_ resource ID was used to
    // create the request, meaning the REST endpoint originated from an earlier API response.
    //
    // ``` typescript
    // const resourceId = '/subscriptions/<s-id>/resourceGroups/<rg-id>/providers/Microsoft.KeyVault/vaults/<kv-id>
    // const path = `https://management.azure.com/${resourceId}/providers/microsoft.insights/diagnosticSettings`;
    // const response = await fetch(path);
    // ```
    //
    // Paths that do _not_ start with `//subscriptions`, but contain a subscription ID, may be
    // fetching all resources for a subscription, meaning the REST endpoint originated from the
    // instance config (and should be replaced in the recording).
    //
    // ``` typescript
    // const resourceGroupName = 'j1dev';
    // const keyVaultName = 'ndowmon11-j1dev';
    // const path = `https://management.azure.com/subscriptions/${config.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${keyVaultName}`;
    // const response = await fetch(path);
    // ```
    return false;
  }

  // By default, we expect that a subscriptionId that exists inside an API path used config.subscriptionId,
  // and should be replaced.
  return true;
}
