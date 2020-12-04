import {
  MockIntegrationStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';
import { IntegrationConfig } from '../../../types';
import { setupAzureRecording } from '../../../../test/helpers/recording';
import { createMockAzureStepExecutionContext } from '../../../../test/createMockAzureStepExecutionContext';
import { ACCOUNT_ENTITY_TYPE } from '../../active-directory';
import { fetchKeyVaults } from '.';
import {
  KEY_VAULT_SERVICE_ENTITY_CLASS,
  KEY_VAULT_SERVICE_ENTITY_TYPE,
} from './constants';
import { MonitorEntities } from '../monitor/constants';

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

describe('step = key vaults', () => {
  let context: MockIntegrationStepExecutionContext<IntegrationConfig>;
  let instanceConfig: IntegrationConfig;

  beforeAll(async () => {
    instanceConfig = {
      clientId: process.env.CLIENT_ID || 'clientId',
      clientSecret: process.env.CLIENT_SECRET || 'clientSecret',
      directoryId: 'bcd90474-9b62-4040-9d7b-8af257b1427d',
      subscriptionId: '40474ebe-55a2-4071-8fa8-b610acdd8e56',
    };

    context = createMockAzureStepExecutionContext({
      instanceConfig,
      entities: [
        {
          _key: `/subscriptions/${instanceConfig.subscriptionId}`,
          _class: ['Account'],
          _type: 'azure_subscription',
          id: `/subscriptions/${instanceConfig.subscriptionId}`,
        },
        {
          _key: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev`,
          _type: 'azure_resource_group',
          _class: ['Group'],
          name: 'j1dev',
          location: 'eastus',
          id: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev`,
        },
      ],
      setData: {
        [ACCOUNT_ENTITY_TYPE]: {
          defaultDomain: 'www.fake-domain.com',
          _type: ACCOUNT_ENTITY_TYPE,
          _key: 'azure_account_id',
          id: 'azure_account_id',
        },
      },
    });

    recording = setupAzureRecording({
      directory: __dirname,
      name: 'resource-manager-step-key-vaults',
    });

    await fetchKeyVaults(context);
  });

  it('should collect an Azure Key Vault entity', () => {
    const { collectedEntities } = context.jobState;

    expect(collectedEntities).toContainEqual(
      expect.objectContaining({
        _class: KEY_VAULT_SERVICE_ENTITY_CLASS,
        _type: KEY_VAULT_SERVICE_ENTITY_TYPE,
        category: ['infrastructure'],
        displayName: 'keionned1-j1dev',
        region: 'eastus',
        resourceGroup: 'j1dev',
        endpoints: ['https://keionned1-j1dev.vault.azure.net/'],
        _key: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.KeyVault/vaults/keionned1-j1dev`,
        id: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.KeyVault/vaults/keionned1-j1dev`,
        webLink: `https://portal.azure.com/#@www.fake-domain.com/resource/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.KeyVault/vaults/keionned1-j1dev`,
      }),
    );
  });

  it('should collect an Azure Account has Azure Key Vault relationship', () => {
    const { collectedRelationships } = context.jobState;

    expect(collectedRelationships).toContainEqual({
      _class: 'HAS',
      _fromEntityKey: 'azure_account_id',
      _key: `azure_account_id|has|/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.KeyVault/vaults/keionned1-j1dev`,
      _toEntityKey: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.KeyVault/vaults/keionned1-j1dev`,
      _type: 'azure_account_has_keyvault_service',
      displayName: 'HAS',
    });
  });

  it('should collect an Azure Resource Group has Azure Key Vault relationship', () => {
    const { collectedRelationships } = context.jobState;

    expect(collectedRelationships).toContainEqual({
      _class: 'HAS',
      _fromEntityKey: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev`,
      _key: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev|has|/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.KeyVault/vaults/keionned1-j1dev`,
      _toEntityKey: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.KeyVault/vaults/keionned1-j1dev`,
      _type: 'azure_resource_group_has_keyvault_service',
      displayName: 'HAS',
    });
  });

  it('should collect an Azure Diagnostic Log Setting entity', () => {
    const { collectedEntities } = context.jobState;

    expect(collectedEntities).toContainEqual(
      expect.objectContaining({
        _class: MonitorEntities.DIAGNOSTIC_LOG_SETTING._class,
        _key: `/subscriptions/${instanceConfig.subscriptionId}/resourcegroups/j1dev/providers/microsoft.keyvault/vaults/keionned1-j1dev/providers/microsoft.insights/diagnosticSettings/j1dev_key_vault_diag_set/logs/AuditEvent/true/7/true`,
        _type: MonitorEntities.DIAGNOSTIC_LOG_SETTING._type,
        category: 'AuditEvent',
        displayName: 'j1dev_key_vault_diag_set',
        enabled: true,
        eventHubAuthorizationRuleId: null,
        eventHubName: null,
        id: `/subscriptions/${instanceConfig.subscriptionId}/resourcegroups/j1dev/providers/microsoft.keyvault/vaults/keionned1-j1dev/providers/microsoft.insights/diagnosticSettings/j1dev_key_vault_diag_set/logs/AuditEvent/true/7/true`,
        logAnalyticsDestinationType: null,
        name: 'j1dev_key_vault_diag_set',
        'retentionPolicy.days': 7,
        'retentionPolicy.enabled': true,
        serviceBusRuleId: null,
        storageAccountId: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.Storage/storageAccounts/j1devkeyvaultdiagsetstrg`,
        webLink: `https://portal.azure.com/#@www.fake-domain.com/resource/subscriptions/${instanceConfig.subscriptionId}/resourcegroups/j1dev/providers/microsoft.keyvault/vaults/keionned1-j1dev/providers/microsoft.insights/diagnosticSettings/j1dev_key_vault_diag_set`,
        workspaceId: null,
      }),
    );
  });

  it('should collect an Azure Key Vault has Azure Diagnostic Log Setting relationship', () => {
    const { collectedRelationships } = context.jobState;

    expect(collectedRelationships).toContainEqual({
      _class: 'HAS',
      _fromEntityKey: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.KeyVault/vaults/keionned1-j1dev`,
      _key: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.KeyVault/vaults/keionned1-j1dev|has|/subscriptions/${instanceConfig.subscriptionId}/resourcegroups/j1dev/providers/microsoft.keyvault/vaults/keionned1-j1dev/providers/microsoft.insights/diagnosticSettings/j1dev_key_vault_diag_set/logs/AuditEvent/true/7/true`,
      _toEntityKey: `/subscriptions/${instanceConfig.subscriptionId}/resourcegroups/j1dev/providers/microsoft.keyvault/vaults/keionned1-j1dev/providers/microsoft.insights/diagnosticSettings/j1dev_key_vault_diag_set/logs/AuditEvent/true/7/true`,
      _type: 'azure_keyvault_service_has_diagnostic_log_setting',
      displayName: 'HAS',
    });
  });

  it('should collect an Azure Diagnostic Log Setting uses Azure Storage Account relationship', () => {
    const { collectedRelationships } = context.jobState;

    expect(collectedRelationships).toContainEqual({
      _class: 'USES',
      _fromEntityKey: `/subscriptions/${instanceConfig.subscriptionId}/resourcegroups/j1dev/providers/microsoft.keyvault/vaults/keionned1-j1dev/providers/microsoft.insights/diagnosticSettings/j1dev_key_vault_diag_set/logs/AuditEvent/true/7/true`,
      _key: `/subscriptions/${instanceConfig.subscriptionId}/resourcegroups/j1dev/providers/microsoft.keyvault/vaults/keionned1-j1dev/providers/microsoft.insights/diagnosticSettings/j1dev_key_vault_diag_set/logs/AuditEvent/true/7/true|uses|/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.Storage/storageAccounts/j1devkeyvaultdiagsetstrg`,
      _toEntityKey: `/subscriptions/${instanceConfig.subscriptionId}/resourceGroups/j1dev/providers/Microsoft.Storage/storageAccounts/j1devkeyvaultdiagsetstrg`,
      _type: 'azure_diagnostic_log_setting_uses_storage_account',
      displayName: 'USES',
    });
  });
});
